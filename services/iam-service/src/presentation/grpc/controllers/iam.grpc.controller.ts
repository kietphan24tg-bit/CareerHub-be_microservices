import { Metadata } from '@grpc/grpc-js';
import { getRequestIdFromGrpcMetadata } from '@careerhub/infrastructure';
import {
  type ActivateIdentityRequest,
  type ActivateIdentityResponse,
  type GetCurrentIdentityRequest,
  type GetCurrentIdentityResponse,
  IAM_GRPC_SERVICE_NAME,
  type LoginIdentityRequest,
  type LoginIdentityResponse,
  type LogoutSessionRequest,
  type LogoutSessionResponse,
  type RefreshSessionRequest,
  type RefreshSessionResponse,
  type RegisterIdentityRequest,
  type RegisterIdentityResponse,
  type ValidateAccessTokenRequest,
  type ValidateAccessTokenResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  ActivateIdentityUseCase,
  GetCurrentIdentityUseCase,
  LoginIdentityUseCase,
  LogoutSessionUseCase,
  RefreshSessionUseCase,
  RegisterIdentityUseCase,
  ValidateAccessTokenUseCase
} from '../../../application';
import { mapErrorToIamGrpcException } from '../mappers/grpc-error.mapper';

type RegisterIdentityGrpcRequest = RegisterIdentityRequest & {
  acceptedTerms?: boolean;
  requestId?: string;
};

@Controller()
export class IamGrpcController {
  constructor(
    private readonly registerIdentityUseCase: RegisterIdentityUseCase,
    private readonly loginIdentityUseCase: LoginIdentityUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutSessionUseCase: LogoutSessionUseCase,
    private readonly validateAccessTokenUseCase: ValidateAccessTokenUseCase,
    private readonly getCurrentIdentityUseCase: GetCurrentIdentityUseCase,
    private readonly activateIdentityUseCase: ActivateIdentityUseCase
  ) {}

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'RegisterIdentity')
  async registerIdentity(
    request: RegisterIdentityGrpcRequest,
    metadata?: Metadata
  ): Promise<RegisterIdentityResponse> {
    try {
      const result = await this.registerIdentityUseCase.execute({
        acceptedTerms: request.accepted_terms ?? request.acceptedTerms,
        email: request.email,
        password: request.password,
        requestId:
          request.request_id ??
          request.requestId ??
          getRequestIdFromGrpcMetadata(metadata),
        role: request.role
      });

      return {
        created_at: result.createdAt,
        email: result.email,
        identity_id: result.identityId,
        role: result.role,
        status: result.status
      } as unknown as RegisterIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'ActivateIdentity')
  async activateIdentity(
    request: ActivateIdentityRequest
  ): Promise<ActivateIdentityResponse> {
    try {
      const result = await this.activateIdentityUseCase.execute({
        identityId: request.identity_id
      });

      return {
        identity_id: result.identityId,
        status: result.status ?? 'unknown'
      } as unknown as ActivateIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'LoginIdentity')
  async loginIdentity(
    request: LoginIdentityRequest
  ): Promise<LoginIdentityResponse> {
    try {
      const result = await this.loginIdentityUseCase.execute({
        email: request.email,
        password: request.password,
        rememberMe: request.remember_me
      });

      return {
        access_token: result.accessToken,
        email: result.email,
        identity_id: result.identityId,
        refresh_token: result.refreshToken,
        role: result.role
      } as unknown as LoginIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'RefreshSession')
  async refreshSession(
    request: RefreshSessionRequest
  ): Promise<RefreshSessionResponse> {
    try {
      const result = await this.refreshSessionUseCase.execute({
        refreshToken: request.refresh_token
      });

      return {
        access_token: result.accessToken,
        email: result.email,
        identity_id: result.identityId,
        refresh_token: result.refreshToken,
        role: result.role
      } as unknown as RefreshSessionResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'LogoutSession')
  async logoutSession(
    request: LogoutSessionRequest
  ): Promise<LogoutSessionResponse> {
    try {
      const loggedOut = (
        await this.logoutSessionUseCase.execute({
          refreshToken: request.refresh_token
        })
      ).loggedOut;

      return {
        logged_out: loggedOut
      } as unknown as LogoutSessionResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'ValidateAccessToken')
  async validateAccessToken(
    request: ValidateAccessTokenRequest
  ): Promise<ValidateAccessTokenResponse> {
    try {
      const result = await this.validateAccessTokenUseCase.execute({
        accessToken: request.access_token
      });

      return {
        email: result.email,
        role: result.role,
        user_id: result.identityId,
        valid: true
      } as unknown as ValidateAccessTokenResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'GetCurrentIdentity')
  async getCurrentIdentity(
    request: GetCurrentIdentityRequest
  ): Promise<GetCurrentIdentityResponse> {
    try {
      const result = await this.getCurrentIdentityUseCase.execute({
        identityId: request.identity_id
      });

      return {
        email: result.email,
        identity_id: result.identityId,
        role: result.role,
        status: result.status ?? 'unknown'
      } as unknown as GetCurrentIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }
}
