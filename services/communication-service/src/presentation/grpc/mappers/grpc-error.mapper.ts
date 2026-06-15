import { mapErrorToRpcException } from '@careerhub/infrastructure';
import type { RpcException } from '@nestjs/microservices';

export function mapErrorToCommunicationGrpcException(
  error: unknown
): RpcException {
  return mapErrorToRpcException(error);
}
