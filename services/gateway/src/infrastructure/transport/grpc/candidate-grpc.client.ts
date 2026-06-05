import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  CreateCandidateProfileRequest,
  CreateCandidateProfileResponse
} from '@careerhub/contracts';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  CANDIDATE_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { mapRpcErrorToHttpException } from '@careerhub/nest-common';
import { Injectable } from '@nestjs/common';
import { GatewayGrpcClient } from './gateway-grpc.client';

type CandidateGrpcServiceClient = {
  CreateCandidateProfile(
    request: CreateCandidateProfileRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateCandidateProfileResponse
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
export class CandidateGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  async createCandidateProfile(
    request: CreateCandidateProfileRequest,
    requestId?: string
  ): Promise<CreateCandidateProfileResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('candidate');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      CANDIDATE_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[
      CANDIDATE_GRPC_SERVICE_NAME
    ] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => CandidateGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${CANDIDATE_GRPC_SERVICE_NAME}`
      );
    }

    const client = new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      fullName: request.full_name,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as CreateCandidateProfileRequest & {
      fullName: string;
      identityId: string;
      requestId: string;
    };

    return new Promise<CreateCandidateProfileResponse>((resolve, reject) => {
      client.CreateCandidateProfile(
        grpcRequest,
        clientFactory.metadata(requestId),
        (error, response) => {
          if (error) {
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            reject(new Error('Candidate gRPC returned an empty response'));
            return;
          }

          resolve(response);
        }
      );
    });
  }
}
