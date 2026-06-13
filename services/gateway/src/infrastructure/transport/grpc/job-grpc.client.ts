import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  ArchiveJobRequest,
  ArchiveJobResponse,
  CloseJobRequest,
  CloseJobResponse,
  CreateJobRequest,
  CreateJobResponse,
  GetEmployerJobByIdRequest,
  GetEmployerJobByIdResponse,
  GetJobForApplicationRequest,
  GetJobForApplicationResponse,
  GetPublicJobBySlugRequest,
  GetPublicJobBySlugResponse,
  JobExistsRequest,
  JobExistsResponse,
  ListEmployerJobsRequest,
  ListEmployerJobsResponse,
  ListJobsByIdsRequest,
  ListJobsByIdsResponse,
  ListPublicJobsRequest,
  ListPublicJobsResponse,
  PublishJobRequest,
  PublishJobResponse,
  ReopenJobRequest,
  ReopenJobResponse,
  UpdateJobRequest,
  UpdateJobResponse
} from '@careerhub/contracts';
import {
  JOB_GRPC_PACKAGE_NAME,
  JOB_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { GatewayGrpcClient } from './gateway-grpc.client';

type JobGrpcServiceClient = {
  ArchiveJob(
    request: ArchiveJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ArchiveJobResponse) => void
  ): ClientUnaryCall;
  CloseJob(
    request: CloseJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: CloseJobResponse) => void
  ): ClientUnaryCall;
  CreateJob(
    request: CreateJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: CreateJobResponse) => void
  ): ClientUnaryCall;
  GetEmployerJobById(
    request: GetEmployerJobByIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetEmployerJobByIdResponse
    ) => void
  ): ClientUnaryCall;
  GetPublicJobBySlug(
    request: GetPublicJobBySlugRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetPublicJobBySlugResponse
    ) => void
  ): ClientUnaryCall;
  GetJobForApplication(
    request: GetJobForApplicationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetJobForApplicationResponse
    ) => void
  ): ClientUnaryCall;
  JobExists(
    request: JobExistsRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: JobExistsResponse) => void
  ): ClientUnaryCall;
  ListEmployerJobs(
    request: ListEmployerJobsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListEmployerJobsResponse
    ) => void
  ): ClientUnaryCall;
  ListJobsByIds(
    request: ListJobsByIdsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListJobsByIdsResponse
    ) => void
  ): ClientUnaryCall;
  ListPublicJobs(
    request: ListPublicJobsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListPublicJobsResponse
    ) => void
  ): ClientUnaryCall;
  PublishJob(
    request: PublishJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: PublishJobResponse) => void
  ): ClientUnaryCall;
  ReopenJob(
    request: ReopenJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ReopenJobResponse) => void
  ): ClientUnaryCall;
  UpdateJob(
    request: UpdateJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UpdateJobResponse) => void
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
export class JobGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: JobGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const client = this.createServiceClient();
    const clientFactory = this.gatewayGrpcClient.createClient('job');
    const parentContext = context.active();
    const span = startSpan(
      `job.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': JOB_GRPC_SERVICE_NAME,
          'rpc.system': 'grpc'
        },
        kind: SpanKind.CLIENT
      },
      parentContext
    );

    return runWithSpanContext(span, parentContext, () =>
      new Promise<TResponse>((resolve, reject) => {
        operation(client, request, clientFactory.metadata(requestId), (error, response) => {
          if (error) {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message
            });
            span.end();
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            const emptyResponseError = new Error('Job gRPC returned an empty response');
            span.recordException(emptyResponseError);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: emptyResponseError.message
            });
            span.end();
            reject(emptyResponseError);
            return;
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          resolve(response);
        });
      })
    );
  }

  private createServiceClient(): JobGrpcServiceClient {
    const clientFactory = this.gatewayGrpcClient.createClient('job');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      JOB_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[JOB_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => JobGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${JOB_GRPC_SERVICE_NAME}`
      );
    }

    return new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
  }

  async listPublicJobs(
    request: ListPublicJobsRequest,
    requestId?: string
  ): Promise<ListPublicJobsResponse> {
    return this.invokeUnary(
      'ListPublicJobs',
      (client, payload, metadata, callback) =>
        client.ListPublicJobs(payload, metadata, callback),
      {
        ...request,
        request_id: requestId ?? request.request_id ?? ''
      },
      requestId
    );
  }

  async getPublicJobBySlug(
    request: GetPublicJobBySlugRequest,
    requestId?: string
  ): Promise<GetPublicJobBySlugResponse> {
    return this.invokeUnary(
      'GetPublicJobBySlug',
      (client, payload, metadata, callback) =>
        client.GetPublicJobBySlug(payload, metadata, callback),
      {
        ...request,
        request_id: requestId ?? request.request_id ?? ''
      },
      requestId
    );
  }

  async listEmployerJobs(
    request: ListEmployerJobsRequest,
    requestId?: string
  ): Promise<ListEmployerJobsResponse> {
    const grpcRequest = {
      ...request,
      employerIdentityId: request.employer_identity_id,
      pageSize: request.page_size,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as ListEmployerJobsRequest & {
      employerIdentityId: string;
      pageSize?: number;
      requestId: string;
    };

    return this.invokeUnary(
      'ListEmployerJobs',
      (client, payload, metadata, callback) =>
        client.ListEmployerJobs(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getEmployerJobById(
    request: GetEmployerJobByIdRequest,
    requestId?: string
  ): Promise<GetEmployerJobByIdResponse> {
    const grpcRequest = {
      ...request,
      employerIdentityId: request.employer_identity_id,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetEmployerJobByIdRequest & {
      employerIdentityId: string;
      jobId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'GetEmployerJobById',
      (client, payload, metadata, callback) =>
        client.GetEmployerJobById(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getJobForApplication(
    request: GetJobForApplicationRequest,
    requestId?: string
  ): Promise<GetJobForApplicationResponse> {
    const grpcRequest = {
      ...request,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetJobForApplicationRequest & {
      jobId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'GetJobForApplication',
      (client, payload, metadata, callback) =>
        client.GetJobForApplication(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async createJob(
    request: CreateJobRequest,
    requestId?: string
  ): Promise<CreateJobResponse> {
    const grpcRequest = {
      ...request,
      companyId: request.company_id,
      companyIndustry: request.company_industry,
      companyLogoUrl: request.company_logo_url,
      companyName: request.company_name,
      companyWebsite: request.company_website,
      employerIdentityId: request.employer_identity_id,
      employmentType: request.employment_type,
      expiresAt: request.expires_at,
      isRemote: request.is_remote,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? '',
      salaryMax: request.salary_max,
      salaryMin: request.salary_min
    } as CreateJobRequest & Record<string, unknown>;

    return this.invokeUnary(
      'CreateJob',
      (client, payload, metadata, callback) =>
        client.CreateJob(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async updateJob(
    request: UpdateJobRequest,
    requestId?: string
  ): Promise<UpdateJobResponse> {
    const grpcRequest = {
      ...request,
      clearFields: request.clear_fields ?? [],
      employerIdentityId: request.employer_identity_id,
      employmentType: request.employment_type,
      expiresAt: request.expires_at,
      isRemote: request.is_remote,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? '',
      salaryMax: request.salary_max,
      salaryMin: request.salary_min,
      updatedFields: request.updated_fields ?? []
    } as UpdateJobRequest & Record<string, unknown>;

    return this.invokeUnary(
      'UpdateJob',
      (client, payload, metadata, callback) =>
        client.UpdateJob(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async publishJob(
    request: PublishJobRequest,
    requestId?: string
  ): Promise<PublishJobResponse> {
    return this.transitionJob('PublishJob', request, requestId);
  }

  async closeJob(
    request: CloseJobRequest,
    requestId?: string
  ): Promise<CloseJobResponse> {
    return this.transitionJob('CloseJob', request, requestId);
  }

  async archiveJob(
    request: ArchiveJobRequest,
    requestId?: string
  ): Promise<ArchiveJobResponse> {
    return this.transitionJob('ArchiveJob', request, requestId);
  }

  async reopenJob(
    request: ReopenJobRequest,
    requestId?: string
  ): Promise<ReopenJobResponse> {
    return this.transitionJob('ReopenJob', request, requestId);
  }

  async listJobsByIds(
    request: ListJobsByIdsRequest,
    requestId?: string
  ): Promise<ListJobsByIdsResponse> {
    const grpcRequest = {
      ...request,
      jobIds: request.job_ids,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as ListJobsByIdsRequest & {
      jobIds: string[];
      requestId: string;
    };

    return this.invokeUnary(
      'ListJobsByIds',
      (client, payload, metadata, callback) =>
        client.ListJobsByIds(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async jobExists(
    request: JobExistsRequest,
    requestId?: string
  ): Promise<JobExistsResponse> {
    const grpcRequest = {
      ...request,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as JobExistsRequest & {
      jobId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'JobExists',
      (client, payload, metadata, callback) =>
        client.JobExists(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  private transitionJob<TRequest extends { employer_identity_id: string; job_id: string }, TResponse>(
    methodName: 'PublishJob' | 'CloseJob' | 'ArchiveJob' | 'ReopenJob',
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const grpcRequest = {
      ...request,
      employerIdentityId: request.employer_identity_id,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as TRequest & Record<string, unknown>;

    return this.invokeUnary(
      methodName,
      (client, payload, metadata, callback) => {
        const method = client[methodName] as (
          req: TRequest,
          metadata: Metadata,
          cb: (error: ServiceError | null, response: TResponse) => void
        ) => ClientUnaryCall;

        return method.call(client, payload, metadata, callback);
      },
      grpcRequest,
      requestId
    );
  }
}
