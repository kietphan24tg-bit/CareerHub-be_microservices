import { mapErrorToRpcException } from '@careerhub/nest-common';
import type { RpcException } from '@nestjs/microservices';

export function mapErrorToIamGrpcException(error: unknown): RpcException {
  return mapErrorToRpcException(error);
}
