import {
  type CallOptions,
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  CreateCandidateProfileRequest,
  CreateCandidateProfileResponse,
  DeleteCandidateProfileCompensationRequest,
  DeleteCandidateProfileCompensationResponse,
  GetCandidateProfileByIdentityIdRequest,
  GetCandidateProfileByIdentityIdResponse
} from '@careerhub/contracts';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  CANDIDATE_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { Injectable } from '@nestjs/common';
import { invokeGrpcUnary, resolveGrpcNamespace } from './grpc.utils';
import { InternalGrpcClient } from './internal-grpc.client';

type CandidateGrpcServiceClient = {
  CreateCandidateProfile(
    request: CreateCandidateProfileRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: CreateCandidateProfileResponse
    ) => void
  ): ClientUnaryCall;
  DeleteCandidateProfileCompensation(
    request: DeleteCandidateProfileCompensationRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: DeleteCandidateProfileCompensationResponse
    ) => void
  ): ClientUnaryCall;
  GetCandidateProfileByIdentityId(
    request: GetCandidateProfileByIdentityIdRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (
      error: ServiceError | null,
      response: GetCandidateProfileByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
};

@Injectable()
export class CandidateGrpcClient {
  constructor(private readonly internalGrpcClient: InternalGrpcClient) {}

  private createServiceClient(): {
    callOptions: () => CallOptions;
    client: CandidateGrpcServiceClient;
    metadata: (requestId?: string) => Metadata;
  } {
    const clientFactory = this.internalGrpcClient.createClient('candidate');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      CANDIDATE_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[CANDIDATE_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => CandidateGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${CANDIDATE_GRPC_SERVICE_NAME}`
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

  async createCandidateProfile(
    request: CreateCandidateProfileRequest,
    requestId?: string
  ): Promise<CreateCandidateProfileResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      fullName: request.full_name,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as CreateCandidateProfileRequest & {
      fullName: string;
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Candidate',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.CreateCandidateProfile(
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

  async deleteCandidateProfileCompensation(
    request: DeleteCandidateProfileCompensationRequest,
    requestId?: string
  ): Promise<DeleteCandidateProfileCompensationResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as DeleteCandidateProfileCompensationRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Candidate',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.DeleteCandidateProfileCompensation(
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

  async getCandidateProfileByIdentityId(
    request: GetCandidateProfileByIdentityIdRequest,
    requestId?: string
  ): Promise<GetCandidateProfileByIdentityIdResponse> {
    const { callOptions, client, metadata } = this.createServiceClient();
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetCandidateProfileByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return invokeGrpcUnary(
      'Candidate',
      (payload, grpcMetadata, grpcCallOptions, callback) =>
        client.GetCandidateProfileByIdentityId(
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
