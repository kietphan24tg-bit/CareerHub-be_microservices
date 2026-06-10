import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  ActivateIdentityRequest,
  ActivateIdentityResponse,
  CancelPendingIdentityRequest,
  CancelPendingIdentityResponse,
  GetCurrentIdentityRequest,
  GetCurrentIdentityResponse,
  LoginIdentityRequest,
  LoginIdentityResponse,
  LogoutSessionRequest,
  LogoutSessionResponse,
  RefreshSessionRequest,
  RefreshSessionResponse,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ValidateAccessTokenRequest,
  ValidateAccessTokenResponse
} from '@careerhub/contracts';
import {
  IAM_GRPC_PACKAGE_NAME,
  IAM_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { GatewayGrpcClient } from './gateway-grpc.client';

type IamGrpcServiceClient = {
  ActivateIdentity(
    request: ActivateIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ActivateIdentityResponse
    ) => void
  ): ClientUnaryCall;
  CancelPendingIdentity(
    request: CancelPendingIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CancelPendingIdentityResponse
    ) => void
  ): ClientUnaryCall;
  GetCurrentIdentity(
    request: GetCurrentIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetCurrentIdentityResponse
    ) => void
  ): ClientUnaryCall;
  LoginIdentity(
    request: LoginIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: LoginIdentityResponse
    ) => void
  ): ClientUnaryCall;
  LogoutSession(
    request: LogoutSessionRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: LogoutSessionResponse
    ) => void
  ): ClientUnaryCall;
  RefreshSession(
    request: RefreshSessionRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RefreshSessionResponse
    ) => void
  ): ClientUnaryCall;
  RegisterIdentity(
    request: RegisterIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RegisterIdentityResponse
    ) => void
  ): ClientUnaryCall;
  ValidateAccessToken(
    request: ValidateAccessTokenRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ValidateAccessTokenResponse
    ) => void
  ): ClientUnaryCall;
  RequestPasswordReset(
    request: RequestPasswordResetRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RequestPasswordResetResponse
    ) => void
  ): ClientUnaryCall;
  ResetPassword(
    request: ResetPasswordRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ResetPasswordResponse
    ) => void
  ): ClientUnaryCall;
};

function resolveGrpcNamespace(
  packageDefinition: Record<string, unknown>,
  packageName: string
): Record<string, unknown> {
  return packageName
    .split('.')
    .reduce<Record<string, unknown>>((current, segment) => {
      const next = current[segment];

      if (!next || typeof next !== 'object') {
        throw new Error(`Unable to resolve gRPC package namespace: ${packageName}`);
      }

      return next as Record<string, unknown>;
    }, packageDefinition);
}

@Injectable()
export class IamGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  private createServiceClient(): {
    client: IamGrpcServiceClient;
    metadata: (requestId?: string) => Metadata;
  } {
    const clientFactory = this.gatewayGrpcClient.createClient('iam');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      IAM_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[
      IAM_GRPC_SERVICE_NAME
    ] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => IamGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${IAM_GRPC_SERVICE_NAME}`
      );
    }

    return {
      client: new ServiceCtor(
        clientFactory.target,
        credentials.createInsecure()
      ),
      metadata: clientFactory.metadata
    };
  }

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: IamGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const { client, metadata } = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `iam.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': IAM_GRPC_SERVICE_NAME,
          'rpc.system': 'grpc'
        },
        kind: SpanKind.CLIENT
      },
      parentContext
    );

    return runWithSpanContext(span, parentContext, () =>
      new Promise<TResponse>((resolve, reject) => {
        operation(client, request, metadata(requestId), (error, response) => {
          if (error) {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message
            });
            span.end();
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            const emptyResponseError = new Error('IAM gRPC returned an empty response');
            span.recordException(emptyResponseError);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: emptyResponseError.message
            });
            span.end();
            reject(emptyResponseError);
            return;
          }

          span.setStatus({
            code: SpanStatusCode.OK
          });
          span.end();
          resolve(response);
        });
      })
    );
  }

  async registerIdentity(
    request: Omit<RegisterIdentityRequest, 'request_id'>,
    requestId?: string
  ): Promise<RegisterIdentityResponse> {
    const grpcRequest = {
      ...request,
      acceptedTerms: request.accepted_terms,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RegisterIdentityRequest & {
      acceptedTerms: boolean;
      requestId: string;
    };

    return this.invokeUnary(
      'RegisterIdentity',
      (client, payload, metadata, callback) =>
        client.RegisterIdentity(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async activateIdentity(
    request: ActivateIdentityRequest,
    requestId?: string
  ): Promise<ActivateIdentityResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ActivateIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'ActivateIdentity',
      (client, payload, metadata, callback) =>
        client.ActivateIdentity(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async cancelPendingIdentity(
    request: CancelPendingIdentityRequest,
    requestId?: string
  ): Promise<CancelPendingIdentityResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as CancelPendingIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'CancelPendingIdentity',
      (client, payload, metadata, callback) =>
        client.CancelPendingIdentity(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async loginIdentity(
    request: LoginIdentityRequest,
    requestId?: string
  ): Promise<LoginIdentityResponse> {
    const grpcRequest = {
      ...request,
      rememberMe: request.remember_me ?? false,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as LoginIdentityRequest & {
      rememberMe: boolean;
      requestId: string;
    };

    return this.invokeUnary(
      'LoginIdentity',
      (client, payload, metadata, callback) =>
        client.LoginIdentity(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async refreshSession(
    request: RefreshSessionRequest,
    requestId?: string
  ): Promise<RefreshSessionResponse> {
    const grpcRequest = {
      ...request,
      refreshToken: request.refresh_token,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RefreshSessionRequest & {
      refreshToken: string;
      requestId: string;
    };

    return this.invokeUnary(
      'RefreshSession',
      (client, payload, metadata, callback) =>
        client.RefreshSession(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async logoutSession(
    request: LogoutSessionRequest,
    requestId?: string
  ): Promise<LogoutSessionResponse> {
    const grpcRequest = {
      ...request,
      refreshToken: request.refresh_token,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as LogoutSessionRequest & {
      refreshToken: string;
      requestId: string;
    };

    return this.invokeUnary(
      'LogoutSession',
      (client, payload, metadata, callback) =>
        client.LogoutSession(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async requestPasswordReset(
    request: RequestPasswordResetRequest,
    requestId?: string
  ): Promise<RequestPasswordResetResponse> {
    const grpcRequest = {
      ...request,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RequestPasswordResetRequest & {
      requestId: string;
    };

    return this.invokeUnary(
      'RequestPasswordReset',
      (client, payload, metadata, callback) =>
        client.RequestPasswordReset(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async resetPassword(
    request: ResetPasswordRequest,
    requestId?: string
  ): Promise<ResetPasswordResponse> {
    const grpcRequest = {
      ...request,
      newPassword: request.new_password,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ResetPasswordRequest & {
      newPassword: string;
      requestId: string;
    };

    return this.invokeUnary(
      'ResetPassword',
      (client, payload, metadata, callback) =>
        client.ResetPassword(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async validateAccessToken(
    request: ValidateAccessTokenRequest,
    requestId?: string
  ): Promise<ValidateAccessTokenResponse> {
    const grpcRequest = {
      ...request,
      accessToken: request.access_token,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ValidateAccessTokenRequest & {
      accessToken: string;
      requestId: string;
    };

    return this.invokeUnary(
      'ValidateAccessToken',
      (client, payload, metadata, callback) =>
        client.ValidateAccessToken(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getCurrentIdentity(
    request: GetCurrentIdentityRequest,
    requestId?: string
  ): Promise<GetCurrentIdentityResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetCurrentIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'GetCurrentIdentity',
      (client, payload, metadata, callback) =>
        client.GetCurrentIdentity(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }
}
