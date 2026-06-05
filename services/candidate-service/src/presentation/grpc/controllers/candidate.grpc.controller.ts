import {
  CANDIDATE_GRPC_SERVICE_NAME,
  type CreateCandidateProfileRequest,
  type CreateCandidateProfileResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CreateCandidateProfileUseCase } from '../../../application';
import { mapErrorToCandidateGrpcException } from '../mappers/grpc-error.mapper';

@Controller()
export class CandidateGrpcController {
  constructor(
    private readonly createCandidateProfileUseCase: CreateCandidateProfileUseCase
  ) {}

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateCandidateProfile')
  async createCandidateProfile(
    request: CreateCandidateProfileRequest
  ): Promise<CreateCandidateProfileResponse> {
    try {
      const result = await this.createCandidateProfileUseCase.execute({
        fullName: request.full_name,
        identityId: request.identity_id,
        phone: request.phone
      });

      return {
        identity_id: result.identityId,
        profile_id: result.profileId
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }
}
