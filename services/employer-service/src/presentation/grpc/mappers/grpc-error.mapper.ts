import { mapErrorToRpcException } from '@careerhub/nest-common';
import type { RpcException } from '@nestjs/microservices';

export function mapErrorToEmployerGrpcException(error: unknown): RpcException {
  return mapErrorToRpcException(error);
}
