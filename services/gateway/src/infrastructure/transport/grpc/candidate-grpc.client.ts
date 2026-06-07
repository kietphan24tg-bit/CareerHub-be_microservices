import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  GetCandidateProfileByIdentityIdRequest,
  GetCandidateProfileByIdentityIdResponse,
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
}
