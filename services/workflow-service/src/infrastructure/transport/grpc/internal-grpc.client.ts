import { Inject, Injectable } from '@nestjs/common';
import type { CallOptions } from '@grpc/grpc-js';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { createGrpcMetadata } from '@careerhub/infrastructure';
import { GRPC_CLIENT_OPTIONS } from './grpc.constants';
import type { InternalGrpcClientOptions } from './grpc.types';

@Injectable()
export class InternalGrpcClient {
  constructor(
    @Inject(GRPC_CLIENT_OPTIONS)
    private readonly options: InternalGrpcClientOptions
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
    const loadedPackage = loadPackageDefinition(packageDefinition) as Record<
      string,
      unknown
    >;

    return {
      callOptions: (): CallOptions => ({
        deadline: Date.now() + serviceConfig.deadlineMs
      }),
      metadata: (requestId?: string) => createGrpcMetadata(requestId),
      packageDefinition: loadedPackage,
      target: serviceConfig.serviceUrl
    };
  }
}
