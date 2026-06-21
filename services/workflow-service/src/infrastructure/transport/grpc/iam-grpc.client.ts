import {
  type CallOptions,
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
  RegisterIdentityRequest,
  RegisterIdentityResponse
} from '@careerhub/contracts';
import {
  IAM_GRPC_PACKAGE_NAME,
  IAM_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { Injectable } from '@nestjs/common';
import { invokeGrpcUnary, resolveGrpcNamespace } from './grpc.utils';
import { InternalGrpcClient } from './internal-grpc.client';

type IamGrpcServiceClient = {
  ActivateIdentity(
    request: ActivateIdentityRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: ActivateIdentityResponse
    ) => void
  ): ClientUnaryCall;
  CancelPendingIdentity(
    request: CancelPendingIdentityRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: CancelPendingIdentityResponse
    ) => void
  ): ClientUnaryCall;
  GetCurrentIdentity(
    request: GetCurrentIdentityRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: GetCurrentIdentityResponse
    ) => void
  ): ClientUnaryCall;
  RegisterIdentity(
    request: RegisterIdentityRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: RegisterIdentityResponse
    ) => void
  ): ClientUnaryCall;
};

@Injectable()
export class IamGrpcClient {
  constructor(private readonly internalGrpcClient: InternalGrpcClient) {}

  private createServiceClient(): {
    callOptions: () => CallOptions;
    client: IamGrpcServiceClient;
    metadata: (requestId?: string) => Metadata;
  } {
    const clientFactory = this.internalGrpcClient.createClient('iam');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      IAM_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[IAM_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => IamGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${IAM_GRPC_SERVICE_NAME}`
      );
    }

    return {
      callOptions: clientFactory.callOptions,
      client: new ServiceCtor(
        clientFactory.target,
        credentials.createInsecure()
      ),
      metadata: clientFactory.metadata
    };
  }

  async registerIdentity(
    request: Omit<RegisterIdentityRequest, 'request_id'>,
    requestId?: string
  ): Promise<RegisterIdentityResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      acceptedTerms: request.accepted_terms,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RegisterIdentityRequest & {
      acceptedTerms: boolean;
      requestId: string;
    };

    return invokeGrpcUnary(
      'IAM',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.RegisterIdentity(
          payload,
          grpcMetadata,
          grpcCallOptions,
          callback
        ),
      grpcRequest,
      metadata(requestId),
      callOptions()
    );
  }

  async activateIdentity(
    request: ActivateIdentityRequest,
    requestId?: string
  ): Promise<ActivateIdentityResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ActivateIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'IAM',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.ActivateIdentity(
          payload,
          grpcMetadata,
          grpcCallOptions,
          callback
        ),
      grpcRequest,
      metadata(requestId),
      callOptions()
    );
  }

  async cancelPendingIdentity(
    request: CancelPendingIdentityRequest,
    requestId?: string
  ): Promise<CancelPendingIdentityResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as CancelPendingIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'IAM',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.CancelPendingIdentity(
          payload,
          grpcMetadata,
          grpcCallOptions,
          callback
        ),
      grpcRequest,
      metadata(requestId),
      callOptions()
    );
  }

  async getCurrentIdentity(
    request: GetCurrentIdentityRequest,
    requestId?: string
  ): Promise<GetCurrentIdentityResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetCurrentIdentityRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'IAM',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.GetCurrentIdentity(
          payload,
          grpcMetadata,
          grpcCallOptions,
          callback
        ),
      grpcRequest,
      metadata(requestId),
      callOptions()
    );
  }
}
