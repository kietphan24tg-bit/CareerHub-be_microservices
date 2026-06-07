import { mapErrorToRpcException } from '@careerhub/infrastructure';
import type { RpcException } from '@nestjs/microservices';

export function mapErrorToEmployerGrpcException(error: unknown): RpcException {
  return mapErrorToRpcException(error);
}
