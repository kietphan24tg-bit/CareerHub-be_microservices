import { mapErrorToRpcException } from '@careerhub/infrastructure';
import type { RpcException } from '@nestjs/microservices';

export function mapErrorToIamGrpcException(error: unknown): RpcException {
  return mapErrorToRpcException(error);
}
