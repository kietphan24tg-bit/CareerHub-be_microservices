import { mapErrorToRpcException } from '@careerhub/infrastructure';
import { ValidationError } from '@careerhub/shared-kernel';
import { RpcException } from '@nestjs/microservices';

import {
  InvalidCredentialsError
} from '../../../application/errors';

const GRPC_INVALID_ARGUMENT_STATUS_CODE = 3;
const GRPC_UNAUTHENTICATED_STATUS_CODE = 16;

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

  return mapErrorToRpcException(error);
}
