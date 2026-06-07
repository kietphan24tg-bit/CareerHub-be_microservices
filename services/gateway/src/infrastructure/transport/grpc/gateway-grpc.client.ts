import { Inject, Injectable } from '@nestjs/common';
import { credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import {
  createGrpcMetadata,
  createGrpcPayloadWithRequestId
} from '@careerhub/infrastructure';
import { GRPC_CLIENT_OPTIONS } from './grpc.constants';
import type {
  GatewayGrpcClientOptions,
  GatewayGrpcServiceClientConfig
} from './grpc.types';

@Injectable()
export class GatewayGrpcClient {
  constructor(
    @Inject(GRPC_CLIENT_OPTIONS)
    private readonly options: GatewayGrpcClientOptions
  ) {}

  createClient(serviceName: string) {
    const serviceConfig = this.options[serviceName];

    if (!serviceConfig) {
      throw new Error(`Missing gRPC config for service: ${serviceName}`);
    }

    const packageDefinition = loadSync(serviceConfig.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    const loadedPackage = loadPackageDefinition(packageDefinition) as Record<string, unknown>;

    return {
      metadata: (requestId?: string) => createGrpcMetadata(requestId),
      packageDefinition: loadedPackage,
      payloadWithRequestId: <TPayload>(payload: TPayload, requestId?: string) =>
        createGrpcPayloadWithRequestId(payload, requestId),
      target: serviceConfig.serviceUrl
    };
  }

  createTransportChannel(serviceName: string) {
    const serviceConfig = this.options[serviceName];

    if (!serviceConfig) {
      throw new Error(`Missing gRPC config for service: ${serviceName}`);
    }

    return {
      credentials: credentials.createInsecure(),
      target: serviceConfig.serviceUrl
    };
  }
}
