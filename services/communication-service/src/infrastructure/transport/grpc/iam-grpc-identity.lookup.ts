import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  credentials,
  loadPackageDefinition,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import {
  IAM_GRPC_PACKAGE_NAME,
  IAM_GRPC_SERVICE_NAME,
  type GetCurrentIdentityRequest,
  type GetCurrentIdentityResponse
} from '@careerhub/contracts';
import { createGrpcMetadata } from '@careerhub/infrastructure';
import type { IdentityLookup } from '../../../application';

type IamGrpcServiceClient = {
  GetCurrentIdentity(
    request: GetCurrentIdentityRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: GetCurrentIdentityResponse) => void
  ): ClientUnaryCall;
};

function resolveGrpcProtoPath(serviceName: 'iam'): string {
  const cwdRelativePath = join(
    process.cwd(),
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    serviceName,
    'v1',
    `${serviceName}.proto`
  );

  if (existsSync(cwdRelativePath)) {
    return cwdRelativePath;
  }

  const distRelativePath = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    serviceName,
    'v1',
    `${serviceName}.proto`
  );

  if (existsSync(distRelativePath)) {
    return distRelativePath;
  }

  return join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'grpc',
    serviceName,
    'v1',
    `${serviceName}.proto`
  );
}

function resolveGrpcNamespace(
  packageDefinition: Record<string, unknown>,
  packageName: string
): Record<string, unknown> {
  return packageName.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, packageDefinition) as Record<string, unknown>;
}

export class IamGrpcIdentityLookup implements IdentityLookup {
  private readonly client: IamGrpcServiceClient;

  constructor(private readonly serviceUrl: string) {
    const packageDefinition = loadSync(resolveGrpcProtoPath('iam'), {
      defaults: true,
      enums: String,
      keepCase: true,
      longs: String,
      oneofs: true
    });
    const loadedPackage = loadPackageDefinition(packageDefinition) as Record<string, unknown>;
    const packageNamespace = resolveGrpcNamespace(loadedPackage, IAM_GRPC_PACKAGE_NAME);
    const ServiceCtor = packageNamespace[IAM_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => IamGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(`Unable to resolve gRPC service constructor: ${IAM_GRPC_SERVICE_NAME}`);
    }

    this.client = new ServiceCtor(serviceUrl, credentials.createInsecure());
  }

  async findEmailByIdentityId(identityId: string, requestId?: string): Promise<string | null> {
    const normalizedIdentityId = identityId.trim();
    if (!normalizedIdentityId) {
      return null;
    }

    const response = await this.invokeUnary<
      GetCurrentIdentityRequest,
      GetCurrentIdentityResponse
    >(
      (request, metadata, callback) =>
        this.client.GetCurrentIdentity(request, metadata, callback),
      {
        identity_id: normalizedIdentityId,
        request_id: requestId ?? ''
      },
      requestId
    );

    return response.email?.trim() || null;
  }

  private invokeUnary<TRequest, TResponse>(
    operation: (
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      operation(request, createGrpcMetadata(requestId), (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        if (!response) {
          reject(new Error('IAM gRPC returned an empty response'));
          return;
        }

        resolve(response);
      });
    });
  }
}
