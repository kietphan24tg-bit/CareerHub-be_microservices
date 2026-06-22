import { ApplicationError, mapErrorToRpcException } from '@careerhub/infrastructure';
import { DomainError, ValidationError } from '@careerhub/shared-kernel';
import { RpcException } from '@nestjs/microservices';

import {
  InvalidCredentialsError
} from '../../../application/errors';

const GRPC_INVALID_ARGUMENT_STATUS_CODE = 3;
const GRPC_NOT_FOUND_STATUS_CODE = 5;
const GRPC_ALREADY_EXISTS_STATUS_CODE = 6;
const GRPC_PERMISSION_DENIED_STATUS_CODE = 7;
const GRPC_UNAUTHENTICATED_STATUS_CODE = 16;

// Raw grpc-js clients (gateway, workflow) can only recover NUMERIC gRPC status
// codes from the wire; string error codes collapse to UNKNOWN through NestJS.
// Translate well-known domain/application error codes to numeric statuses so
// callers map them to the right HTTP status (e.g. CONFLICT -> 409).
const GRPC_STATUS_BY_ERROR_CODE: Record<string, number> = {
  ALREADY_EXISTS: GRPC_ALREADY_EXISTS_STATUS_CODE,
  CONFLICT: GRPC_ALREADY_EXISTS_STATUS_CODE,
  NOT_FOUND: GRPC_NOT_FOUND_STATUS_CODE,
  FORBIDDEN: GRPC_PERMISSION_DENIED_STATUS_CODE,
  PERMISSION_DENIED: GRPC_PERMISSION_DENIED_STATUS_CODE,
  UNAUTHENTICATED: GRPC_UNAUTHENTICATED_STATUS_CODE,
  UNAUTHORIZED: GRPC_UNAUTHENTICATED_STATUS_CODE,
  INVALID_ARGUMENT: GRPC_INVALID_ARGUMENT_STATUS_CODE,
  VALIDATION_ERROR: GRPC_INVALID_ARGUMENT_STATUS_CODE
};

function grpcStatusForError(error: unknown): number | undefined {
  if (error instanceof ApplicationError || error instanceof DomainError) {
    return GRPC_STATUS_BY_ERROR_CODE[error.code];
  }

  return undefined;
}

export function mapErrorToIamGrpcException(error: unknown): Error {
  if (error instanceof InvalidCredentialsError) {
    return new RpcException({
      code: GRPC_UNAUTHENTICATED_STATUS_CODE,
      message: error.message
    });
  }

  if (error instanceof ValidationError) {
    return new RpcException({
      code: GRPC_INVALID_ARGUMENT_STATUS_CODE,
      message: error.message
    });
  }

  const status = grpcStatusForError(error);
  if (status !== undefined && error instanceof Error) {
    return new RpcException({ code: status, message: error.message });
  }

  return mapErrorToRpcException(error);
}
