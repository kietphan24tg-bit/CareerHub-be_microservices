import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  GetEmployerProfileByIdentityIdRequest,
  GetEmployerProfileByIdentityIdResponse,
  UpdateEmployerProfileRequest,
  UpdateEmployerProfileResponse,
  CreateEmployerProfileRequest,
  CreateEmployerProfileResponse
} from '@careerhub/contracts';
import {
  EMPLOYER_GRPC_PACKAGE_NAME,
  EMPLOYER_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
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
  GetEmployerProfileByIdentityId(
    request: GetEmployerProfileByIdentityIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetEmployerProfileByIdentityIdResponse
    ) => void
  ): ClientUnaryCall;
  UpdateEmployerProfile(
    request: UpdateEmployerProfileRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: UpdateEmployerProfileResponse
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

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: EmployerGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('employer');
    const client = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `employer.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': EMPLOYER_GRPC_SERVICE_NAME,
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
            const emptyResponseError = new Error('Employer gRPC returned an empty response');
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

  private createServiceClient(): EmployerGrpcServiceClient {
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

    return new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
  }

  async createEmployerProfile(
    request: CreateEmployerProfileRequest,
    requestId?: string
  ): Promise<CreateEmployerProfileResponse> {
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

    return this.invokeUnary(
      'CreateEmployerProfile',
      (client, payload, metadata, callback) =>
        client.CreateEmployerProfile(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getEmployerProfileByIdentityId(
    request: GetEmployerProfileByIdentityIdRequest,
    requestId?: string
  ): Promise<GetEmployerProfileByIdentityIdResponse> {
    const grpcRequest = {
      ...request,
      identityId: request.identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? ''
    } as GetEmployerProfileByIdentityIdRequest & {
      identityId: string;
      requestId: string;
    };

    return this.invokeUnary(
      'GetEmployerProfileByIdentityId',
      (client, payload, metadata, callback) =>
        client.GetEmployerProfileByIdentityId(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async updateEmployerProfile(
    request: UpdateEmployerProfileRequest,
    requestId?: string
  ): Promise<UpdateEmployerProfileResponse> {
    const grpcRequest = {
      ...request,
      clearFields: request.clear_fields ?? [],
      companyName: request.company_name,
      companySize: request.company_size,
      contactName: request.contact_name,
      contactPhone: request.contact_phone,
      foundedYear: request.founded_year,
      identityId: request.identity_id,
      logoUrl: request.logo_url,
      requestId: requestId ?? '',
      request_id: requestId ?? '',
      taxCode: request.tax_code,
      updatedFields: request.updated_fields ?? []
    } as UpdateEmployerProfileRequest & {
      clearFields: string[];
      companyName?: string;
      companySize?: string;
      contactName?: string;
      contactPhone?: string;
      foundedYear?: number;
      identityId: string;
      logoUrl?: string;
      requestId: string;
      taxCode?: string;
      updatedFields: string[];
    };

    return this.invokeUnary(
      'UpdateEmployerProfile',
      (client, payload, metadata, callback) =>
        client.UpdateEmployerProfile(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }
}
