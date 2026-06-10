import {
  EMPLOYER_GRPC_SERVICE_NAME,
  type CreateEmployerProfileRequest,
  type CreateEmployerProfileResponse,
  type DeleteEmployerProfileCompensationRequest,
  type DeleteEmployerProfileCompensationResponse,
  type EmployerProfile,
  type GetEmployerProfileByIdentityIdRequest,
  type GetEmployerProfileByIdentityIdResponse,
  type UpdateEmployerProfileRequest,
  type UpdateEmployerProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CreateEmployerProfileCommandHandler,
  DeleteEmployerProfileCompensationCommandHandler,
  GetEmployerProfileByIdentityIdQueryHandler,
  UpdateEmployerProfileCommandHandler,
  type EmployerProfileRecord
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

@Controller()
export class EmployerGrpcController {
  constructor(
    private readonly createEmployerProfileCommandHandler: CreateEmployerProfileCommandHandler,
    private readonly deleteEmployerProfileCompensationCommandHandler: DeleteEmployerProfileCompensationCommandHandler,
    private readonly getEmployerProfileByIdentityIdQueryHandler: GetEmployerProfileByIdentityIdQueryHandler,
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
}
