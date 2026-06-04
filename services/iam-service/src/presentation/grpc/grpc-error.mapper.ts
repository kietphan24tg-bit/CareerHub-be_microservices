import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { DomainError } from '@careerhub/shared-kernel';
import { ValidationError } from '@careerhub/shared-kernel';
import { ApplicationError, InfrastructureError } from '@careerhub/nest-common';

function createGrpcPayload(code: number, message: string) {
  return {
    code,
    message
  };
}

export function mapErrorToIamGrpcException(error: unknown): RpcException {
  if (error instanceof ValidationError) {
    return new RpcException(
      createGrpcPayload(status.INVALID_ARGUMENT, error.message)
    );
  }

  if (error instanceof DomainError) {
    return new RpcException(
      createGrpcPayload(status.INVALID_ARGUMENT, error.message)
    );
  }

  if (error instanceof ApplicationError) {
    if (error.code === 'CONFLICT') {
      return new RpcException(
        createGrpcPayload(status.ALREADY_EXISTS, error.message)
      );
    }

    if (error.code === 'FORBIDDEN') {
      return new RpcException(
        createGrpcPayload(status.PERMISSION_DENIED, error.message)
      );
    }

    if (error.code === 'NOT_FOUND') {
      return new RpcException(createGrpcPayload(status.NOT_FOUND, error.message));
    }

    if (error.code === 'UNAUTHORIZED') {
      return new RpcException(
        createGrpcPayload(status.UNAUTHENTICATED, error.message)
      );
    }

    return new RpcException(
      createGrpcPayload(status.INVALID_ARGUMENT, error.message)
    );
  }

  if (error instanceof InfrastructureError) {
    return new RpcException(createGrpcPayload(status.INTERNAL, error.message));
  }

  if (error instanceof Error) {
    return new RpcException(createGrpcPayload(status.INTERNAL, error.message));
  }

  return new RpcException(
    createGrpcPayload(status.INTERNAL, 'An unexpected error occurred')
  );
}
