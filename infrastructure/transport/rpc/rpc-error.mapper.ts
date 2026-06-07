import { RpcException } from '@nestjs/microservices';
import { DomainError, ValidationError } from '@careerhub/shared-kernel';
import { ApplicationError } from '../../errors/application-error';
import { InfrastructureError } from '../../errors/infrastructure-error';

export type RpcErrorPayload = {
    code: string;
    details?: unknown;
    message: string;
};

function createPayload(code: string, message: string, details?: unknown): RpcErrorPayload {
    return {
        code,
        details,
        message
    };
}

export function mapErrorToRpcException(error: unknown): RpcException {
    if (error instanceof ValidationError) {
        return new RpcException(createPayload(error.code, error.message, error.details));
    }

    if (error instanceof DomainError) {
        return new RpcException(createPayload(error.code, error.message, error.details));
    }

    if (error instanceof ApplicationError) {
        return new RpcException(createPayload(error.code, error.message, error.details));
    }

    if (error instanceof InfrastructureError) {
        return new RpcException(createPayload(error.code, error.message, error.details));
    }

    if (error instanceof Error) {
        return new RpcException(createPayload('INTERNAL_SERVER_ERROR', error.message));
    }

    return new RpcException(
        createPayload('INTERNAL_SERVER_ERROR', 'An unexpected error occurred')
    );
}
