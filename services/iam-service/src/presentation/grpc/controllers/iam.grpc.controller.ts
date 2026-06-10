import { Metadata } from '@grpc/grpc-js';
import { getRequestIdFromGrpcMetadata } from '@careerhub/infrastructure';
import {
  type ActivateIdentityRequest,
  type ActivateIdentityResponse,
  type CancelPendingIdentityRequest,
  type CancelPendingIdentityResponse,
  type GetCurrentIdentityRequest,
  type GetCurrentIdentityResponse,
  IAM_GRPC_SERVICE_NAME,
  type LoginIdentityRequest,
  type LoginIdentityResponse,
  type LogoutSessionRequest,
  type LogoutSessionResponse,
  type RefreshSessionRequest,
  type RefreshSessionResponse,
  type RequestPasswordResetRequest,
  type RequestPasswordResetResponse,
  type RegisterIdentityRequest,
  type RegisterIdentityResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type ValidateAccessTokenRequest,
  type ValidateAccessTokenResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  ActivateIdentityCommandHandler,
  CancelPendingIdentityCommandHandler,
  GetCurrentIdentityQueryHandler,
  LoginIdentityCommandHandler,
  LogoutSessionCommandHandler,
  RequestPasswordResetCommandHandler,
  RefreshSessionCommandHandler,
  RegisterIdentityCommandHandler,
  ResetPasswordCommandHandler,
  ValidateAccessTokenQueryHandler
} from '../../../application';
import { mapErrorToIamGrpcException } from '../mappers/grpc-error.mapper';

type RegisterIdentityGrpcRequest = RegisterIdentityRequest & {
  acceptedTerms?: boolean;
  requestId?: string;
};

@Controller()
export class IamGrpcController {
  constructor(
    private readonly registerIdentityCommandHandler: RegisterIdentityCommandHandler,
    private readonly loginIdentityCommandHandler: LoginIdentityCommandHandler,
    private readonly refreshSessionCommandHandler: RefreshSessionCommandHandler,
    private readonly logoutSessionCommandHandler: LogoutSessionCommandHandler,
    private readonly requestPasswordResetCommandHandler: RequestPasswordResetCommandHandler,
    private readonly resetPasswordCommandHandler: ResetPasswordCommandHandler,
    private readonly validateAccessTokenQueryHandler: ValidateAccessTokenQueryHandler,
    private readonly getCurrentIdentityQueryHandler: GetCurrentIdentityQueryHandler,
    private readonly activateIdentityCommandHandler: ActivateIdentityCommandHandler,
    private readonly cancelPendingIdentityCommandHandler: CancelPendingIdentityCommandHandler
  ) {}

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'RegisterIdentity')
  async registerIdentity(
    request: RegisterIdentityGrpcRequest,
    metadata?: Metadata
  ): Promise<RegisterIdentityResponse> {
    try {
      const result = await this.registerIdentityCommandHandler.execute({
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
    request: ActivateIdentityRequest,
    metadata?: Metadata
  ): Promise<ActivateIdentityResponse> {
    try {
      const result = await this.activateIdentityCommandHandler.execute({
        identityId: request.identity_id,
        requestId: request.request_id ?? getRequestIdFromGrpcMetadata(metadata)
      });

      return {
        identity_id: result.identityId,
        status: result.status ?? 'unknown'
      } as unknown as ActivateIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'CancelPendingIdentity')
  async cancelPendingIdentity(
    request: CancelPendingIdentityRequest
  ): Promise<CancelPendingIdentityResponse> {
    try {
      const result = await this.cancelPendingIdentityCommandHandler.execute({
        identityId: request.identity_id
      });

      return {
        cancelled: result.cancelled
      } as unknown as CancelPendingIdentityResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'LoginIdentity')
  async loginIdentity(
    request: LoginIdentityRequest
  ): Promise<LoginIdentityResponse> {
    try {
      const result = await this.loginIdentityCommandHandler.execute({
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
      const result = await this.refreshSessionCommandHandler.execute({
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
        await this.logoutSessionCommandHandler.execute({
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

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'RequestPasswordReset')
  async requestPasswordReset(
    request: RequestPasswordResetRequest,
    metadata?: Metadata
  ): Promise<RequestPasswordResetResponse> {
    try {
      const result = await this.requestPasswordResetCommandHandler.execute({
        email: request.email,
        requestId: request.request_id ?? getRequestIdFromGrpcMetadata(metadata)
      });

      return {
        accepted: result.accepted
      } as unknown as RequestPasswordResetResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'ResetPassword')
  async resetPassword(
    request: ResetPasswordRequest,
    metadata?: Metadata
  ): Promise<ResetPasswordResponse> {
    try {
      const result = await this.resetPasswordCommandHandler.execute({
        newPassword: request.new_password,
        requestId: request.request_id ?? getRequestIdFromGrpcMetadata(metadata),
        token: request.token
      });

      return {
        password_reset: result.passwordReset
      } as unknown as ResetPasswordResponse;
    } catch (error) {
      throw mapErrorToIamGrpcException(error);
    }
  }

  @GrpcMethod(IAM_GRPC_SERVICE_NAME, 'ValidateAccessToken')
  async validateAccessToken(
    request: ValidateAccessTokenRequest
  ): Promise<ValidateAccessTokenResponse> {
    try {
      const result = await this.validateAccessTokenQueryHandler.execute({
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
      const result = await this.getCurrentIdentityQueryHandler.execute({
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
