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
  JOB_GRPC_PACKAGE_NAME,
  JOB_GRPC_SERVICE_NAME,
  type ListJobsByIdsRequest,
  type ListJobsByIdsResponse
} from '@careerhub/contracts';
import { createGrpcMetadata } from '@careerhub/infrastructure';
import type {
  JobMailContext,
  JobMailContextLookup
} from '../../../application/ports/job-mail-context-lookup.port';

type JobGrpcServiceClient = {
  ListJobsByIds(
    request: ListJobsByIdsRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ListJobsByIdsResponse) => void
  ): ClientUnaryCall;
};

function resolveGrpcProtoPath(serviceName: 'job'): string {
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

export class JobGrpcMailContextLookup implements JobMailContextLookup {
  private readonly client: JobGrpcServiceClient;

  constructor(private readonly serviceUrl: string) {
    const packageDefinition = loadSync(resolveGrpcProtoPath('job'), {
      defaults: true,
      enums: String,
      keepCase: true,
      longs: String,
      oneofs: true
    });
    const loadedPackage = loadPackageDefinition(packageDefinition) as Record<string, unknown>;
    const packageNamespace = resolveGrpcNamespace(loadedPackage, JOB_GRPC_PACKAGE_NAME);
    const ServiceCtor = packageNamespace[JOB_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => JobGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(`Unable to resolve gRPC service constructor: ${JOB_GRPC_SERVICE_NAME}`);
    }

    this.client = new ServiceCtor(serviceUrl, credentials.createInsecure());
  }

  async findByJobId(jobId: string, requestId?: string): Promise<JobMailContext | null> {
    const normalizedJobId = jobId.trim();
    if (!normalizedJobId) {
      return null;
    }

    const response = await this.invokeUnary<ListJobsByIdsRequest, ListJobsByIdsResponse>(
      (request, metadata, callback) => this.client.ListJobsByIds(request, metadata, callback),
      {
        job_ids: [normalizedJobId],
        request_id: requestId ?? ''
      },
      requestId
    );

    const job = response.items.find((item) => item.id === normalizedJobId);
    if (!job) {
      return null;
    }

    return {
      companyName: job.company_name?.trim() || 'Not specified',
      jobTitle: job.title?.trim() || 'Not specified'
    };
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
          reject(new Error('Job gRPC returned an empty response'));
          return;
        }

        resolve(response);
      });
    });
  }
}
