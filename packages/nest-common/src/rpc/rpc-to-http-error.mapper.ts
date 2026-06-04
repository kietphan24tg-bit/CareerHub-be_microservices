import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import type { RpcErrorPayload } from './rpc-error.mapper';

type HttpExceptionCtor = new (objectOrError?: string | object, descriptionOrOptions?: string | object) => HttpException;

const HTTP_EXCEPTION_BY_RPC_CODE: Record<string, HttpExceptionCtor> = {
    ALREADY_EXISTS: ConflictException,
    BAD_REQUEST: BadRequestException,
    CONFLICT: ConflictException,
    FORBIDDEN: ForbiddenException,
    INVALID_ARGUMENT: BadRequestException,
    INVALID_CONFIGURATION: InternalServerErrorException,
    INTERNAL: InternalServerErrorException,
    NOT_FOUND: NotFoundException,
    PERMISSION_DENIED: ForbiddenException,
    UNAUTHENTICATED: UnauthorizedException,
    UNAUTHORIZED: UnauthorizedException,
    VALIDATION_ERROR: BadRequestException
};

const HTTP_EXCEPTION_BY_GRPC_STATUS: Record<number, HttpExceptionCtor> = {
    3: BadRequestException,
    5: NotFoundException,
    6: ConflictException,
    7: ForbiddenException,
    13: InternalServerErrorException,
    16: UnauthorizedException
};

type RpcErrorLike = {
    code?: unknown;
    details?: unknown;
    error?: unknown;
    message?: unknown;
};

type ErrorBody = {
    code: string;
    details?: unknown;
    message: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function createBody(code: string, message: string, details?: unknown): ErrorBody {
    return {
        code,
        details,
        message
    };
}

function normalizeRpcErrorPayload(
    error: unknown
): RpcErrorPayload & { code: string | number } {
    if (typeof error === 'string') {
        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: error
        };
    }

    if (error instanceof Error) {
        const maybePayload = error as Error & { cause?: unknown };

        if (isObject(maybePayload.cause)) {
            return normalizeRpcErrorPayload(maybePayload.cause);
        }

        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
        };
    }

    if (isObject(error)) {
        const payload = error as RpcErrorLike;
        const nestedError = payload.error;

        if (nestedError !== undefined && nestedError !== error) {
            return normalizeRpcErrorPayload(nestedError);
        }

        const code =
            typeof payload.code === 'number'
                ? payload.code
                : typeof payload.code === 'string' && payload.code.length > 0
                ? payload.code
                : 'INTERNAL_SERVER_ERROR';
        const message =
            typeof payload.message === 'string' && payload.message.length > 0
                ? payload.message
                : 'An unexpected error occurred';

        return {
            code,
            details: payload.details,
            message
        };
    }

    return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
    };
}

export function mapRpcErrorToHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
        return error;
    }

    const payload = normalizeRpcErrorPayload(error);
    const ExceptionCtor =
        typeof payload.code === 'number'
            ? HTTP_EXCEPTION_BY_GRPC_STATUS[payload.code] ??
              InternalServerErrorException
            : HTTP_EXCEPTION_BY_RPC_CODE[payload.code] ??
              InternalServerErrorException;
    const code =
        typeof payload.code === 'number'
            ? `GRPC_${payload.code}`
            : payload.code;

    return new ExceptionCtor(
        createBody(code, payload.message, payload.details)
    );
}
