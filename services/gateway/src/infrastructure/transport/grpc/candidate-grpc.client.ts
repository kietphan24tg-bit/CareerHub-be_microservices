import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  DeleteCandidateProfileCompensationRequest,
  DeleteCandidateProfileCompensationResponse,
  GetCandidateProfileByIdentityIdRequest,
  GetCandidateProfileByIdentityIdResponse,
  ListSavedJobsByIdentityIdRequest,
  ListSavedJobsByIdentityIdResponse,
  CreateOrGetTemplateDraftRequest,
  CreateOrGetTemplateDraftResponse,
  CreateResumeRequest,
  CreateResumeResponse,
  DeleteResumeRequest,
  DeleteResumeResponse,
  GetResumeByIdRequest,
  GetResumeByIdResponse,
  GetResumeExportPayloadRequest,
  GetResumeExportPayloadResponse,
  GetResumeTemplateByIdRequest,
  GetResumeTemplateByIdResponse,
  ListResumeTemplatesRequest,
  ListResumeTemplatesResponse,
  ListResumesByIdentityIdRequest,
  ListResumesByIdentityIdResponse,
  RemoveSavedJobRequest,
  RemoveSavedJobResponse,
  SaveJobRequest,
  SaveJobResponse,
  UpdateResumeRequest,
  UpdateResumeResponse,
  UpdateCandidateProfileRequest,
  UpdateCandidateProfileResponse,
  CreateCandidateProfileRequest,
  CreateCandidateProfileResponse
} from '@careerhub/contracts';
import {
  CANDIDATE_GRPC_PACKAGE_NAME,
  CANDIDATE_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
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
  DeleteCandidateProfileCompensation(
    request: DeleteCandidateProfileCompensationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: DeleteCandidateProfileCompensationResponse
    ) => void
  ): ClientUnaryCall;
  GetCandidateProfileByIdentityId(
    request: GetCandidateProfileByIdentityIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetCandidateProfileByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
  UpdateCandidateProfile(
    request: UpdateCandidateProfileRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: UpdateCandidateProfileResponse
    ) => void
  ): ClientUnaryCall;
  ListSavedJobsByIdentityId(
    request: ListSavedJobsByIdentityIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListSavedJobsByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
  SaveJob(
    request: SaveJobRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: SaveJobResponse
    ) => void
  ): ClientUnaryCall;
  RemoveSavedJob(
    request: RemoveSavedJobRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RemoveSavedJobResponse
    ) => void
  ): ClientUnaryCall;
  ListResumeTemplates(
    request: ListResumeTemplatesRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListResumeTemplatesResponse
    ) => void
  ): ClientUnaryCall;
  GetResumeTemplateById(
    request: GetResumeTemplateByIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetResumeTemplateByIdResponse
    ) => void
  ): ClientUnaryCall;
  ListResumesByIdentityId(
    request: ListResumesByIdentityIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListResumesByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
  GetResumeById(
    request: GetResumeByIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetResumeByIdResponse
    ) => void
  ): ClientUnaryCall;
  CreateOrGetTemplateDraft(
    request: CreateOrGetTemplateDraftRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateOrGetTemplateDraftResponse
    ) => void
  ): ClientUnaryCall;
  CreateResume(
    request: CreateResumeRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateResumeResponse
    ) => void
  ): ClientUnaryCall;
  UpdateResume(
    request: UpdateResumeRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: UpdateResumeResponse
    ) => void
  ): ClientUnaryCall;
  DeleteResume(
    request: DeleteResumeRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: DeleteResumeResponse
    ) => void
  ): ClientUnaryCall;
  GetResumeExportPayload(
    request: GetResumeExportPayloadRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetResumeExportPayloadResponse
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

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: CandidateGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('candidate');
    const client = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `candidate.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': CANDIDATE_GRPC_SERVICE_NAME,
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
            const emptyResponseError = new Error('Candidate gRPC returned an empty response');
            span.recordException(emptyResponseError);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: emptyResponseError.message
            });
            span.end();
            reject(emptyResponseError);
            return;
          }

          span.setStatus({
            code: SpanStatusCode.OK
          });
          span.end();
          resolve(response);
        });
      })
    );
  }

  private createServiceClient(): CandidateGrpcServiceClient {
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

    return new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
  }

  async createCandidateProfile(
    request: CreateCandidateProfileRequest,
    requestId?: string
  ): Promise<CreateCandidateProfileResponse> {
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

    return this.invokeUnary(
      'CreateCandidateProfile',
      (client, payload, metadata, callback) =>
        client.CreateCandidateProfile(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getCandidateProfileByIdentityId(
    request: GetCandidateProfileByIdentityIdRequest,
    requestId?: string
  ): Promise<GetCandidateProfileByIdentityIdResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetCandidateProfileByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'GetCandidateProfileByIdentityId',
      (client, payload, metadata, callback) =>
        client.GetCandidateProfileByIdentityId(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async deleteCandidateProfileCompensation(
    request: DeleteCandidateProfileCompensationRequest,
    requestId?: string
  ): Promise<DeleteCandidateProfileCompensationResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as DeleteCandidateProfileCompensationRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'DeleteCandidateProfileCompensation',
      (client, payload, metadata, callback) =>
        client.DeleteCandidateProfileCompensation(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listSavedJobsByIdentityId(
    request: ListSavedJobsByIdentityIdRequest,
    requestId?: string
  ): Promise<ListSavedJobsByIdentityIdResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ListSavedJobsByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'ListSavedJobsByIdentityId',
      (client, payload, metadata, callback) =>
        client.ListSavedJobsByIdentityId(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async saveJob(
    request: SaveJobRequest,
    requestId?: string
  ): Promise<SaveJobResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as SaveJobRequest & {
      identityId: string;
      jobId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'SaveJob',
      (client, payload, metadata, callback) =>
        client.SaveJob(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async removeSavedJob(
    request: RemoveSavedJobRequest,
    requestId?: string
  ): Promise<RemoveSavedJobResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RemoveSavedJobRequest & {
      identityId: string;
      jobId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'RemoveSavedJob',
      (client, payload, metadata, callback) =>
        client.RemoveSavedJob(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async updateCandidateProfile(
    request: UpdateCandidateProfileRequest,
    requestId?: string
  ): Promise<UpdateCandidateProfileResponse> {
    const grpcRequest = {
      ...request,
      clearFields: request.clear_fields ?? [],
      fullName: request.full_name,
      githubUrl: request.github_url,
      identityId: request.identity_id,
      linkedinUrl: request.linkedin_url,
      portfolioUrl: request.portfolio_url,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      updatedFields: request.updated_fields ?? [],
      yearsExperience: request.years_experience
    } as UpdateCandidateProfileRequest & {
      clearFields: string[];
      fullName?: string;
      githubUrl?: string;
      identityId: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      requestId: string;
      updatedFields: string[];
      yearsExperience?: number;
    };

    return this.invokeUnary(
      'UpdateCandidateProfile',
      (client, payload, metadata, callback) =>
        client.UpdateCandidateProfile(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listResumeTemplates(
    request: ListResumeTemplatesRequest,
    requestId?: string
  ): Promise<ListResumeTemplatesResponse> {
    const grpcRequest = {
      ...request,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ListResumeTemplatesRequest & { requestId: string };

    return this.invokeUnary(
      'ListResumeTemplates',
      (client, payload, metadata, callback) =>
        client.ListResumeTemplates(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getResumeTemplateById(
    request: GetResumeTemplateByIdRequest,
    requestId?: string
  ): Promise<GetResumeTemplateByIdResponse> {
    const grpcRequest = {
      ...request,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      templateId: request.template_id
    } as GetResumeTemplateByIdRequest & {
      requestId: string;
      templateId: string;
    };

    return this.invokeUnary(
      'GetResumeTemplateById',
      (client, payload, metadata, callback) =>
        client.GetResumeTemplateById(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listResumesByIdentityId(
    request: ListResumesByIdentityIdRequest,
    requestId?: string
  ): Promise<ListResumesByIdentityIdResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as ListResumesByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'ListResumesByIdentityId',
      (client, payload, metadata, callback) =>
        client.ListResumesByIdentityId(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getResumeById(
    request: GetResumeByIdRequest,
    requestId?: string
  ): Promise<GetResumeByIdResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      resumeId: request.resume_id
    } as GetResumeByIdRequest & {
      identityId: string;
      requestId: string;
      resumeId: string;
    };

    return this.invokeUnary(
      'GetResumeById',
      (client, payload, metadata, callback) =>
        client.GetResumeById(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async createOrGetTemplateDraft(
    request: CreateOrGetTemplateDraftRequest,
    requestId?: string
  ): Promise<CreateOrGetTemplateDraftResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      templateId: request.template_id
    } as CreateOrGetTemplateDraftRequest & {
      identityId: string;
      requestId: string;
      templateId: string;
    };

    return this.invokeUnary(
      'CreateOrGetTemplateDraft',
      (client, payload, metadata, callback) =>
        client.CreateOrGetTemplateDraft(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async createResume(
    request: CreateResumeRequest,
    requestId?: string
  ): Promise<CreateResumeResponse> {
    const grpcRequest = {
      ...request,
      contentJson: request.content_json,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      templateId: request.template_id
    } as CreateResumeRequest & {
      contentJson: string;
      identityId: string;
      requestId: string;
      templateId: string;
    };

    return this.invokeUnary(
      'CreateResume',
      (client, payload, metadata, callback) =>
        client.CreateResume(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async updateResume(
    request: UpdateResumeRequest,
    requestId?: string
  ): Promise<UpdateResumeResponse> {
    const grpcRequest = {
      ...request,
      contentJson: request.content_json,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      resumeId: request.resume_id
    } as UpdateResumeRequest & {
      contentJson: string;
      identityId: string;
      requestId: string;
      resumeId: string;
    };

    return this.invokeUnary(
      'UpdateResume',
      (client, payload, metadata, callback) =>
        client.UpdateResume(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async deleteResume(
    request: DeleteResumeRequest,
    requestId?: string
  ): Promise<DeleteResumeResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      resumeId: request.resume_id
    } as DeleteResumeRequest & {
      identityId: string;
      requestId: string;
      resumeId: string;
    };

    return this.invokeUnary(
      'DeleteResume',
      (client, payload, metadata, callback) =>
        client.DeleteResume(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getResumeExportPayload(
    request: GetResumeExportPayloadRequest,
    requestId?: string
  ): Promise<GetResumeExportPayloadResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      resumeId: request.resume_id
    } as GetResumeExportPayloadRequest & {
      identityId: string;
      requestId: string;
      resumeId: string;
    };

    return this.invokeUnary(
      'GetResumeExportPayload',
      (client, payload, metadata, callback) =>
        client.GetResumeExportPayload(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }
}
