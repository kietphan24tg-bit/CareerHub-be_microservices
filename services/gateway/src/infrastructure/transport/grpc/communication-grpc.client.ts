import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  CreateNotificationRequest,
  CreateNotificationResponse,
  GetNotificationRequest,
  GetNotificationResponse,
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkAllNotificationsReadRequest,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse
} from '@careerhub/contracts';
import {
  COMMUNICATION_GRPC_PACKAGE_NAME,
  COMMUNICATION_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { GatewayGrpcClient } from './gateway-grpc.client';

type CommunicationGrpcServiceClient = {
  CreateNotification(
    request: CreateNotificationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateNotificationResponse
    ) => void
  ): ClientUnaryCall;
  GetNotification(
    request: GetNotificationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetNotificationResponse
    ) => void
  ): ClientUnaryCall;
  ListNotifications(
    request: ListNotificationsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListNotificationsResponse
    ) => void
  ): ClientUnaryCall;
  MarkAllNotificationsRead(
    request: MarkAllNotificationsReadRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: MarkAllNotificationsReadResponse
    ) => void
  ): ClientUnaryCall;
  MarkNotificationRead(
    request: MarkNotificationReadRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: MarkNotificationReadResponse
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
export class CommunicationGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: CommunicationGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('communication');
    const client = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `communication.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': COMMUNICATION_GRPC_SERVICE_NAME,
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
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.end();
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            const emptyResponseError = new Error('Communication gRPC returned an empty response');
            span.recordException(emptyResponseError);
            span.setStatus({ code: SpanStatusCode.ERROR, message: emptyResponseError.message });
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

  private createServiceClient(): CommunicationGrpcServiceClient {
    const clientFactory = this.gatewayGrpcClient.createClient('communication');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      COMMUNICATION_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[
      COMMUNICATION_GRPC_SERVICE_NAME
    ] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => CommunicationGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${COMMUNICATION_GRPC_SERVICE_NAME}`
      );
    }

    return new ServiceCtor(clientFactory.target, credentials.createInsecure());
  }

  private withRequestId<T extends { request_id?: string }>(request: T, requestId?: string): T {
    return {
      ...request,
      request_id: requestId ?? request.request_id ?? ''
    };
  }

  async createNotification(
    request: CreateNotificationRequest,
    requestId?: string
  ): Promise<CreateNotificationResponse> {
    return this.invokeUnary(
      'CreateNotification',
      (client, payload, metadata, callback) =>
        client.CreateNotification(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async listNotifications(
    request: ListNotificationsRequest,
    requestId?: string
  ): Promise<ListNotificationsResponse> {
    return this.invokeUnary(
      'ListNotifications',
      (client, payload, metadata, callback) =>
        client.ListNotifications(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async getNotification(
    request: GetNotificationRequest,
    requestId?: string
  ): Promise<GetNotificationResponse> {
    return this.invokeUnary(
      'GetNotification',
      (client, payload, metadata, callback) =>
        client.GetNotification(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async markNotificationRead(
    request: MarkNotificationReadRequest,
    requestId?: string
  ): Promise<MarkNotificationReadResponse> {
    return this.invokeUnary(
      'MarkNotificationRead',
      (client, payload, metadata, callback) =>
        client.MarkNotificationRead(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async markAllNotificationsRead(
    request: MarkAllNotificationsReadRequest,
    requestId?: string
  ): Promise<MarkAllNotificationsReadResponse> {
    return this.invokeUnary(
      'MarkAllNotificationsRead',
      (client, payload, metadata, callback) =>
        client.MarkAllNotificationsRead(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }
}
