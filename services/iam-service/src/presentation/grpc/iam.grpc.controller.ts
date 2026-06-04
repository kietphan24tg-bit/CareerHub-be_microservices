import { Metadata } from '@grpc/grpc-js';
import {
  getRequestIdFromGrpcMetadata
} from '@careerhub/nest-common';
import {
  IAM_GRPC_SERVICE_NAME,
  type RegisterIdentityRequest,
  type RegisterIdentityResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterIdentityUseCase } from '../../application';
import { mapErrorToIamGrpcException } from './grpc-error.mapper';

@Controller()
export class IamGrpcController {
  constructor(
    private readonly registerIdentityUseCase: RegisterIdentityUseCase
  ) {}

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'RegisterIdentity')
  async registerIdentity(
    request: RegisterIdentityRequest,
    metadata?: Metadata
  ): Promise<RegisterIdentityResponse> {
    try {
      const result = await this.registerIdentityUseCase.execute({
        acceptedTerms: request.accepted_terms,
        email: request.email,
        password: request.password,
        requestId:
          request.request_id ?? getRequestIdFromGrpcMetadata(metadata),
        role: request.role
      });

      return {
        created_at: result.createdAt,
        email: result.email,
        identity_id: result.identityId,
        role: result.role,
        status: result.status
      };
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }
}
