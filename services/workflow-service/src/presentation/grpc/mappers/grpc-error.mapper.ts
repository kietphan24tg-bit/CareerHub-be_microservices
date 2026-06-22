import { ApplicationError, mapErrorToRpcException } from '@careerhub/infrastructure';
import { RpcException } from '@nestjs/microservices';

const GRPC_STATUS_INVALID_ARGUMENT = 3;
const GRPC_STATUS_NOT_FOUND = 5;
const GRPC_STATUS_ALREADY_EXISTS = 6;
const GRPC_STATUS_PERMISSION_DENIED = 7;
const GRPC_STATUS_UNAUTHENTICATED = 16;

// The gateway calls workflow over a raw grpc-js client, which can only recover
// NUMERIC gRPC status codes. Translate well-known error codes (preserved from
// downstream services through the saga) to numeric statuses so the gateway maps
// them to the right HTTP status (e.g. CONFLICT -> 409) instead of 500/UNKNOWN.
const GRPC_STATUS_BY_ERROR_CODE: Record<string, number> = {
  ALREADY_EXISTS: GRPC_STATUS_ALREADY_EXISTS,
  CONFLICT: GRPC_STATUS_ALREADY_EXISTS,
  NOT_FOUND: GRPC_STATUS_NOT_FOUND,
  FORBIDDEN: GRPC_STATUS_PERMISSION_DENIED,
  PERMISSION_DENIED: GRPC_STATUS_PERMISSION_DENIED,
  UNAUTHENTICATED: GRPC_STATUS_UNAUTHENTICATED,
  UNAUTHORIZED: GRPC_STATUS_UNAUTHENTICATED,
  INVALID_ARGUMENT: GRPC_STATUS_INVALID_ARGUMENT,
  VALIDATION_ERROR: GRPC_STATUS_INVALID_ARGUMENT
};

export function mapErrorToWorkflowGrpcException(error: unknown): RpcException {
  if (error instanceof ApplicationError) {
    const status = GRPC_STATUS_BY_ERROR_CODE[error.code];
    if (status !== undefined) {
      return new RpcException({ code: status, message: error.message });
    }
  }

  return mapErrorToRpcException(error);
}
