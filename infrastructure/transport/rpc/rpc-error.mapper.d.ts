import { RpcException } from '@nestjs/microservices';
export type RpcErrorPayload = {
    code: string;
    details?: unknown;
    message: string;
};
export declare function mapErrorToRpcException(error: unknown): RpcException;
