import {
  type CallOptions,
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  CreateEmployerProfileRequest,
  CreateEmployerProfileResponse,
  DeleteEmployerProfileCompensationRequest,
  DeleteEmployerProfileCompensationResponse,
  GetEmployerProfileByIdentityIdRequest,
  GetEmployerProfileByIdentityIdResponse
} from '@careerhub/contracts';
import {
  EMPLOYER_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { Injectable } from '@nestjs/common';
import { invokeGrpcUnary, resolveGrpcNamespace } from './grpc.utils';
import { InternalGrpcClient } from './internal-grpc.client';

type EmployerGrpcServiceClient = {
  CreateEmployerProfile(
    request: CreateEmployerProfileRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: CreateEmployerProfileResponse
    ) => void
  ): ClientUnaryCall;
  DeleteEmployerProfileCompensation(
    request: DeleteEmployerProfileCompensationRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: DeleteEmployerProfileCompensationResponse
    ) => void
  ): ClientUnaryCall;
  GetEmployerProfileByIdentityId(
    request: GetEmployerProfileByIdentityIdRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: GetEmployerProfileByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
};

@Injectable()
export class EmployerGrpcClient {
  constructor(private readonly internalGrpcClient: InternalGrpcClient) {}

  private createServiceClient(): {
    callOptions: () => CallOptions;
    client: EmployerGrpcServiceClient;
    metadata: (requestId?: string) => Metadata;
  } {
    const clientFactory = this.internalGrpcClient.createClient('employer');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      EMPLOYER_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[EMPLOYER_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => EmployerGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${EMPLOYER_GRPC_SERVICE_NAME}`
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

  async createEmployerProfile(
    request: CreateEmployerProfileRequest,
    requestId?: string
  ): Promise<CreateEmployerProfileResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      companyName: request.company_name,
      contactName: request.contact_name,
      contactPhone: request.contact_phone,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as CreateEmployerProfileRequest & {
      companyName: string;
      contactName: string;
      contactPhone: string;
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Employer',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.CreateEmployerProfile(
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

  async deleteEmployerProfileCompensation(
    request: DeleteEmployerProfileCompensationRequest,
    requestId?: string
  ): Promise<DeleteEmployerProfileCompensationResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as DeleteEmployerProfileCompensationRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Employer',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.DeleteEmployerProfileCompensation(
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

  async getEmployerProfileByIdentityId(
    request: GetEmployerProfileByIdentityIdRequest,
    requestId?: string
  ): Promise<GetEmployerProfileByIdentityIdResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetEmployerProfileByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Employer',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.GetEmployerProfileByIdentityId(
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
