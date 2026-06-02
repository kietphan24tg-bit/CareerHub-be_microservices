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
    BAD_REQUEST: BadRequestException,
    CONFLICT: ConflictException,
    FORBIDDEN: ForbiddenException,
    NOT_FOUND: NotFoundException,
    UNAUTHORIZED: UnauthorizedException,
    VALIDATION_ERROR: BadRequestException
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

function normalizeRpcErrorPayload(error: unknown): RpcErrorPayload {
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
            typeof payload.code === 'string' && payload.code.length > 0
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
        HTTP_EXCEPTION_BY_RPC_CODE[payload.code] ?? InternalServerErrorException;

    return new ExceptionCtor(
        createBody(payload.code, payload.message, payload.details)
    );
}
