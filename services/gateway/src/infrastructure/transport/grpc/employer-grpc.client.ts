import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  CreateEmployerProfileRequest,
  CreateEmployerProfileResponse
} from '@careerhub/contracts';
import {
  EMPLOYER_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import { mapRpcErrorToHttpException } from '@careerhub/nest-common';
import { Injectable } from '@nestjs/common';
import { GatewayGrpcClient } from './gateway-grpc.client';

type EmployerGrpcServiceClient = {
  CreateEmployerProfile(
    request: CreateEmployerProfileRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateEmployerProfileResponse
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
export class EmployerGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  async createEmployerProfile(
    request: CreateEmployerProfileRequest,
    requestId?: string
  ): Promise<CreateEmployerProfileResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('employer');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      EMPLOYER_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[
      EMPLOYER_GRPC_SERVICE_NAME
    ] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => EmployerGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${EMPLOYER_GRPC_SERVICE_NAME}`
      );
    }

    const client = new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
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

    return new Promise<CreateEmployerProfileResponse>((resolve, reject) => {
      client.CreateEmployerProfile(
        grpcRequest,
        clientFactory.metadata(requestId),
        (error, response) => {
          if (error) {
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            reject(new Error('Employer gRPC returned an empty response'));
            return;
          }

          resolve(response);
        }
      );
    });
  }
}
