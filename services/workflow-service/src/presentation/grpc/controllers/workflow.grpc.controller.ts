import {
  WORKFLOW_GRPC_SERVICE_NAME,
  type RegisterCandidateRequest,
  type RegisterEmployerRequest,
  type RegistrationSagaResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  RegisterCandidateCommandHandler,
  RegisterEmployerCommandHandler
} from '../../../application';
import { mapErrorToWorkflowGrpcException } from '../mappers/grpc-error.mapper';

@Controller()
export class WorkflowGrpcController {
  constructor(
    private readonly registerCandidateCommandHandler: RegisterCandidateCommandHandler,
    private readonly registerEmployerCommandHandler: RegisterEmployerCommandHandler
  ) {}

  @GrpcMethod(WORKFLOW_GRPC_SERVICE_NAME, 'RegisterCandidate')
  async registerCandidate(
    request: RegisterCandidateRequest
  ): Promise<RegistrationSagaResponse> {
    try {
      const result = await this.registerCandidateCommandHandler.execute({
        acceptTerms: request.accept_terms,
        email: request.email,
        fullName: request.full_name,
        password: request.password,
        phone: request.phone,
        requestId: request.request_id
      });

      return {
        email: result.email,
        identity_id: result.identityId,
        role: result.role,
        saga_id: result.sagaId,
        status: result.status
      };
    } catch (error) {
      throw mapErrorToWorkflowGrpcException(error);
    }
  }

  @GrpcMethod(WORKFLOW_GRPC_SERVICE_NAME, 'RegisterEmployer')
  async registerEmployer(
    request: RegisterEmployerRequest
  ): Promise<RegistrationSagaResponse> {
    try {
      const result = await this.registerEmployerCommandHandler.execute({
        acceptTerms: request.accept_terms,
        address: request.address,
        companyEmail: request.company_email,
        companyName: request.company_name,
        fullName: request.full_name,
        industry: request.industry,
        password: request.password,
        phone: request.phone,
        requestId: request.request_id
      });

      return {
        email: result.email,
        identity_id: result.identityId,
        role: result.role,
        saga_id: result.sagaId,
        status: result.status
      };
    } catch (error) {
      throw mapErrorToWorkflowGrpcException(error);
    }
  }
}
