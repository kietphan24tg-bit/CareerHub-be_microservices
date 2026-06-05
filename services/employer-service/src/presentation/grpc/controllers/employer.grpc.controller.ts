import {
  EMPLOYER_GRPC_SERVICE_NAME,
  type CreateEmployerProfileRequest,
  type CreateEmployerProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CreateEmployerProfileUseCase } from '../../../application';
import { mapErrorToEmployerGrpcException } from '../mappers/grpc-error.mapper';

@Controller()
export class EmployerGrpcController {
  constructor(
    private readonly createEmployerProfileUseCase: CreateEmployerProfileUseCase
  ) {}

  @GrpcMethod(EMPLOYER_GRPC_SERVICE_NAME, 'CreateEmployerProfile')
  async createEmployerProfile(
    request: CreateEmployerProfileRequest
  ): Promise<CreateEmployerProfileResponse> {
    try {
      const result = await this.createEmployerProfileUseCase.execute({
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
      };
    } catch (error) {
      throw mapErrorToEmployerGrpcException(error);
    }
  }
}
