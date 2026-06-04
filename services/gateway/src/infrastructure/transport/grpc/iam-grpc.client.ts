import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  RegisterIdentityRequest,
  RegisterIdentityResponse
} from '@careerhub/contracts';
import {
  IAM_GRPC_PACKAGE_NAME,
  IAM_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { mapRpcErrorToHttpException } from '@careerhub/nest-common';
import { Injectable } from '@nestjs/common';
import { GatewayGrpcClient } from './gateway-grpc.client';

type IamGrpcServiceClient = {
  RegisterIdentity(
    request: RegisterIdentityRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RegisterIdentityResponse
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

  async registerIdentity(
    request: Omit<RegisterIdentityRequest, 'request_id'>,
    requestId?: string
  ): Promise<RegisterIdentityResponse> {
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

    const client = new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );

    return new Promise<RegisterIdentityResponse>((resolve, reject) => {
      client.RegisterIdentity(
        {
          ...request,
          request_id: requestId
        },
        clientFactory.metadata(requestId),
        (error, response) => {
          if (error) {
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          resolve(response);
        }
      );
    });
  }
}
