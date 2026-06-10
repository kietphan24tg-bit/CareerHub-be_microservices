import { mapErrorToRpcException } from '@careerhub/infrastructure';
import { RpcException } from '@nestjs/microservices';

import { InvalidCredentialsError } from '../../../application/errors';

const GRPC_UNAUTHENTICATED_STATUS_CODE = 16;

export function mapErrorToIamGrpcException(error: unknown): Error {
  if (error instanceof InvalidCredentialsError) {
    return new RpcException({
      code: GRPC_UNAUTHENTICATED_STATUS_CODE,
      message: error.message
    });
  }

  return mapErrorToRpcException(error);
}
