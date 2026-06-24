import {
  EMPLOYER_GRPC_SERVICE_NAME,
  type CreateDepartmentRequest,
  type CreateEmployerProfileRequest,
  type CreateEmployerProfileResponse,
  type DeleteDepartmentRequest,
  type DeleteDepartmentResponse,
  type DeleteEmployerProfileCompensationRequest,
  type DeleteEmployerProfileCompensationResponse,
  type Department,
  type DepartmentResponse,
  type EmployerProfile,
  type GetEmployerProfileByIdentityIdRequest,
  type GetEmployerProfileByIdentityIdResponse,
  type ListDepartmentsByCompanyRequest,
  type ListDepartmentsByCompanyResponse,
  type UpdateDepartmentRequest,
  type UpdateEmployerProfileRequest,
  type UpdateEmployerProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CreateDepartmentCommandHandler,
  CreateEmployerProfileCommandHandler,
  DeleteDepartmentCommandHandler,
  DeleteEmployerProfileCompensationCommandHandler,
  GetEmployerProfileByIdentityIdQueryHandler,
  ListDepartmentsByCompanyQueryHandler,
  UpdateDepartmentCommandHandler,
  UpdateEmployerProfileCommandHandler,
  type DepartmentRecord,
  type EmployerProfileRecord,
  EmployerProfileNotFoundError
} from '../../../application';
import { mapErrorToEmployerGrpcException } from '../mappers/grpc-error.mapper';

function toGrpcEmployerProfile(profile: EmployerProfileRecord): EmployerProfile {
  const nullFields: string[] = [];

  const collectNullable = (fieldName: string, value: string | number | null) => {
    if (value === null) {
      nullFields.push(fieldName);
    }
  };

  collectNullable('logo_url', profile.logoUrl);
  collectNullable('website', profile.website);
  collectNullable('industry', profile.industry);
  collectNullable('company_size', profile.companySize);
  collectNullable('founded_year', profile.foundedYear);
  collectNullable('description', profile.description);
  collectNullable('address', profile.address);
  collectNullable('tax_code', profile.taxCode);
  collectNullable('contact_name', profile.contactName);
  collectNullable('contact_phone', profile.contactPhone);

  return {
    address: profile.address ?? '',
    company_name: profile.companyName,
    company_size: profile.companySize ?? '',
    contact_name: profile.contactName ?? '',
    contact_phone: profile.contactPhone ?? '',
    created_at: profile.createdAt.toISOString(),
    description: profile.description ?? '',
    founded_year: profile.foundedYear ?? 0,
    id: profile.id,
    identity_id: profile.identityId,
    industry: profile.industry ?? '',
    logo_url: profile.logoUrl ?? '',
    null_fields: nullFields,
    tax_code: profile.taxCode ?? '',
    updated_at: profile.updatedAt.toISOString(),
    website: profile.website ?? ''
  } as unknown as EmployerProfile;
}

function toGrpcDepartment(record: DepartmentRecord): Department {
  const nullFields: string[] = [];

  if (record.description === null) nullFields.push('description');

  return {
    company_id: record.companyId,
    created_at: record.createdAt.toISOString(),
    description: record.description ?? '',
    id: record.id,
    name: record.name,
    null_fields: nullFields,
    updated_at: record.updatedAt.toISOString()
  } as unknown as Department;
}

@Controller()
export class EmployerGrpcController {
  constructor(
    private readonly createDepartmentCommandHandler: CreateDepartmentCommandHandler,
    private readonly createEmployerProfileCommandHandler: CreateEmployerProfileCommandHandler,
    private readonly deleteDepartmentCommandHandler: DeleteDepartmentCommandHandler,
    private readonly deleteEmployerProfileCompensationCommandHandler: DeleteEmployerProfileCompensationCommandHandler,
    private readonly getEmployerProfileByIdentityIdQueryHandler: GetEmployerProfileByIdentityIdQueryHandler,
    private readonly listDepartmentsByCompanyQueryHandler: ListDepartmentsByCompanyQueryHandler,
    private readonly updateDepartmentCommandHandler: UpdateDepartmentCommandHandler,
    private readonly updateEmployerProfileCommandHandler: UpdateEmployerProfileCommandHandler
  ) {}

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'CreateEmployerProfile')
  async createEmployerProfile(
    request: CreateEmployerProfileRequest
  ): Promise<CreateEmployerProfileResponse> {
    try {
      const result = await this.createEmployerProfileCommandHandler.execute({
        address: request.address,
        companyName: request.company_name,
        contactName: request.contact_name,
        contactPhone: request.contact_phone,
        identityId: request.identity_id,
        industry: request.industry
      });

      return {
        identity_id: result.identityId,
        profile_id: result.profileId
      } as unknown as CreateEmployerProfileResponse;
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(
    EMPLOYER_GRPC_SERVICE_NAME,
    'DeleteEmployerProfileCompensation'
  )
  async deleteEmployerProfileCompensation(
    request: DeleteEmployerProfileCompensationRequest
  ): Promise<DeleteEmployerProfileCompensationResponse> {
    try {
      const result =
        await this.deleteEmployerProfileCompensationCommandHandler.execute({
          identityId: request.identity_id
        });

      return {
        compensated: result.compensated
      } as unknown as DeleteEmployerProfileCompensationResponse;
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'GetEmployerProfileByIdentityId')
  async getEmployerProfileByIdentityId(
    request: GetEmployerProfileByIdentityIdRequest
  ): Promise<GetEmployerProfileByIdentityIdResponse> {
    try {
      const profile = await this.getEmployerProfileByIdentityIdQueryHandler.execute({
        identityId: request.identity_id
      });

      return {
        profile: toGrpcEmployerProfile(profile)
      };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'UpdateEmployerProfile')
  async updateEmployerProfile(
    request: UpdateEmployerProfileRequest
  ): Promise<UpdateEmployerProfileResponse> {
    try {
      const updatedFields = new Set(request.updated_fields ?? []);
      const clearFields = new Set(request.clear_fields ?? []);
      const profile = await this.updateEmployerProfileCommandHandler.execute({
        address: updatedFields.has('address')
          ? request.address
          : clearFields.has('address')
            ? null
            : undefined,
        companyName: updatedFields.has('company_name')
          ? request.company_name
          : undefined,
        companySize: updatedFields.has('company_size')
          ? request.company_size
          : clearFields.has('company_size')
            ? null
            : undefined,
        contactName: updatedFields.has('contact_name')
          ? request.contact_name
          : clearFields.has('contact_name')
            ? null
            : undefined,
        contactPhone: updatedFields.has('contact_phone')
          ? request.contact_phone
          : clearFields.has('contact_phone')
            ? null
            : undefined,
        description: updatedFields.has('description')
          ? request.description
          : clearFields.has('description')
            ? null
            : undefined,
        foundedYear: updatedFields.has('founded_year')
          ? request.founded_year
          : clearFields.has('founded_year')
            ? null
            : undefined,
        identityId: request.identity_id,
        industry: updatedFields.has('industry')
          ? request.industry
          : clearFields.has('industry')
            ? null
            : undefined,
        logoUrl: updatedFields.has('logo_url')
          ? request.logo_url
          : clearFields.has('logo_url')
            ? null
            : undefined,
        taxCode: updatedFields.has('tax_code')
          ? request.tax_code
          : clearFields.has('tax_code')
            ? null
            : undefined,
        website: updatedFields.has('website')
          ? request.website
          : clearFields.has('website')
            ? null
            : undefined
      });

      return {
        profile: toGrpcEmployerProfile(profile)
      };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'ListDepartmentsByCompany')
  async listDepartmentsByCompany(
    request: ListDepartmentsByCompanyRequest
  ): Promise<ListDepartmentsByCompanyResponse> {
    try {
      const profile = await this.getEmployerProfileByIdentityIdQueryHandler.execute({
        identityId: request.identity_id
      });

      const departments = await this.listDepartmentsByCompanyQueryHandler.execute({
        companyId: profile.id
      });

      return { departments: departments.map(toGrpcDepartment) };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'CreateDepartment')
  async createDepartment(request: CreateDepartmentRequest): Promise<DepartmentResponse> {
    try {
      const profile = await this.getEmployerProfileByIdentityIdQueryHandler.execute({
        identityId: request.identity_id
      });

      const department = await this.createDepartmentCommandHandler.execute({
        companyId: profile.id,
        description: request.description || null,
        name: request.name
      });

      return { department: toGrpcDepartment(department) };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'UpdateDepartment')
  async updateDepartment(request: UpdateDepartmentRequest): Promise<DepartmentResponse> {
    try {
      const updatedFields = new Set(request.updated_fields ?? []);
      const clearFields = new Set(request.clear_fields ?? []);

      const department = await this.updateDepartmentCommandHandler.execute({
        id: request.id,
        name: updatedFields.has('name') ? request.name : undefined,
        description: updatedFields.has('description')
          ? request.description
          : clearFields.has('description')
            ? null
            : undefined
      });

      return { department: toGrpcDepartment(department) };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'DeleteDepartment')
  async deleteDepartment(request: DeleteDepartmentRequest): Promise<DeleteDepartmentResponse> {
    try {
      await this.deleteDepartmentCommandHandler.execute({ id: request.id });

      return { deleted: true } as unknown as DeleteDepartmentResponse;
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }
}
