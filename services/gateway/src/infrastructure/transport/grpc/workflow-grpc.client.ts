import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  RegisterCandidateRequest,
  RegisterEmployerRequest,
  RegistrationSagaResponse
} from '@careerhub/contracts';
import {
  WORKFLOW_GRPC_PACKAGE_NAME,
  WORKFLOW_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { GatewayGrpcClient } from './gateway-grpc.client';

type WorkflowGrpcServiceClient = {
  RegisterCandidate(
    request: RegisterCandidateRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RegistrationSagaResponse
    ) => void
  ): ClientUnaryCall;
  RegisterEmployer(
    request: RegisterEmployerRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RegistrationSagaResponse
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
export class WorkflowGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  private createServiceClient(): {
    client: WorkflowGrpcServiceClient;
    metadata: (requestId?: string) => Metadata;
  } {
    const clientFactory = this.gatewayGrpcClient.createClient('workflow');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      WORKFLOW_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[
      WORKFLOW_GRPC_SERVICE_NAME
    ] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => WorkflowGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${WORKFLOW_GRPC_SERVICE_NAME}`
      );
    }

    return {
      client: new ServiceCtor(
        clientFactory.target,
        credentials.createInsecure()
      ),
      metadata: clientFactory.metadata
    };
  }

  private invokeUnary<TRequest>(
    methodName: string,
    operation: (
      client: WorkflowGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (
        error: ServiceError | null,
        response: RegistrationSagaResponse
      ) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<RegistrationSagaResponse> {
    const { client, metadata } = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `workflow.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': WORKFLOW_GRPC_SERVICE_NAME,
          'rpc.system': 'grpc'
        },
        kind: SpanKind.CLIENT
      },
      parentContext
    );

    return runWithSpanContext(span, parentContext, () =>
      new Promise<RegistrationSagaResponse>((resolve, reject) => {
        operation(client, request, metadata(requestId), (error, response) => {
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
            const emptyResponseError = new Error(
              'Workflow gRPC returned an empty response'
            );
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

  async registerCandidate(
    request: Omit<RegisterCandidateRequest, 'request_id'>,
    requestId?: string
  ): Promise<RegistrationSagaResponse> {
    const grpcRequest = {
      ...request,
      acceptTerms: request.accept_terms,
      fullName: request.full_name,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RegisterCandidateRequest & {
      acceptTerms: boolean;
      fullName: string;
      requestId: string;
    };

    return this.invokeUnary(
      'RegisterCandidate',
      (client, payload, metadata, callback) =>
        client.RegisterCandidate(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async registerEmployer(
    request: Omit<RegisterEmployerRequest, 'request_id'>,
    requestId?: string
  ): Promise<RegistrationSagaResponse> {
    const grpcRequest = {
      ...request,
      acceptTerms: request.accept_terms,
      companyEmail: request.company_email,
      companyName: request.company_name,
      fullName: request.full_name,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as RegisterEmployerRequest & {
      acceptTerms: boolean;
      companyEmail: string;
      companyName: string;
      fullName: string;
      requestId: string;
    };

    return this.invokeUnary(
      'RegisterEmployer',
      (client, payload, metadata, callback) =>
        client.RegisterEmployer(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }
}
