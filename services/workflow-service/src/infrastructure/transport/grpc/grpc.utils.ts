import type {
  CallOptions,
  ClientUnaryCall,
  Metadata,
  ServiceError
} from '@grpc/grpc-js';
import { ApplicationError } from '@careerhub/infrastructure';

const APPLICATION_CODE_BY_GRPC_STATUS: Record<number, string> = {
  3: 'INVALID_ARGUMENT',
  4: 'GATEWAY_TIMEOUT',
  5: 'NOT_FOUND',
  6: 'ALREADY_EXISTS',
  7: 'FORBIDDEN',
  13: 'INTERNAL',
  16: 'UNAUTHENTICATED'
};

function parseGrpcMessage(message: string): {
  code?: string;
  message: string;
} {
  const match = message.match(/^\d+\s+([A-Z_]+):\s+(.+)$/);

  if (!match) {
    return { message };
  }

  return {
    code: match[1],
    message: match[2]
  };
}

export function normalizeGrpcServiceError(error: ServiceError): ApplicationError {
  const parsedMessage = parseGrpcMessage(error.message);
  const applicationCode =
    parsedMessage.code ??
    APPLICATION_CODE_BY_GRPC_STATUS[error.code] ??
    'INTERNAL_SERVER_ERROR';

  return new ApplicationError(parsedMessage.message, {
    code: applicationCode,
    details: {
      grpcCode: error.code,
      grpcDetails: error.details
    },
    cause: error
  });
}

export function resolveGrpcNamespace(
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

export function invokeGrpcUnary<TRequest, TResponse>(
  serviceLabel: string,
  operation: (
    request: TRequest,
    metadata: Metadata,
    callOptions: CallOptions,
    callback: (error: ServiceError | null, response: TResponse) => void
  ) => ClientUnaryCall,
  request: TRequest,
  metadata: Metadata,
  callOptions: CallOptions
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    operation(request, metadata, callOptions, (error, response) => {
      if (error) {
        reject(normalizeGrpcServiceError(error));
        return;
      }

      if (!response) {
        reject(
          new ApplicationError(`${serviceLabel} gRPC returned an empty response`, {
            code: 'INTERNAL_SERVER_ERROR'
          })
        );
        return;
      }

      resolve(response);
    });
  });
}
