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
    APPLICATION_NOT_FOUND: NotFoundException,
    BAD_REQUEST: BadRequestException,
    CONFLICT: ConflictException,
    DUPLICATE_APPLICATION: ConflictException,
    FORBIDDEN: ForbiddenException,
    FORBIDDEN_APPLICATION_ACCESS: ForbiddenException,
    INVALID_APPLICATION_STATUS_TRANSITION: BadRequestException,
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

type NormalizedRpcErrorPayload = {
    code: string | number;
    details?: unknown;
    message: string;
};

type ParsedGrpcMessage = {
    code?: string;
    message: string;
};

function looksLikeTokenAuthFailure(
    code: string | number,
    message: string,
    details?: unknown
): boolean {
    if (code !== 'UNKNOWN' && code !== 2) {
        return false;
    }

    const detailsText = typeof details === 'string' ? details : '';
    const haystack = `${message} ${detailsText}`.toLowerCase();

    return haystack.includes('invalid refresh token') || haystack.includes('invalid access token');
}

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

function parseGrpcMessage(message: string): ParsedGrpcMessage {
    const match = message.match(/^\d+\s+([A-Z_]+):\s+(.+)$/);

    if (!match) {
        return { message };
    }

    return {
        code: match[1],
        message: match[2]
    };
}

function normalizeRpcErrorPayload(
    error: unknown
): NormalizedRpcErrorPayload {
    if (typeof error === 'string') {
        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: error
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
    const parsedMessage = parseGrpcMessage(payload.message);
    const normalizedMessage = parsedMessage.message;
    const tokenAuthFailure = looksLikeTokenAuthFailure(
        payload.code,
        normalizedMessage,
        payload.details
    );
    const normalizedCode =
        tokenAuthFailure
            ? 'UNAUTHORIZED'
            : typeof payload.code === 'number'
            ? parsedMessage.code ?? `GRPC_${payload.code}`
            : payload.code;
    const ExceptionCtor =
        tokenAuthFailure
            ? UnauthorizedException
            : typeof payload.code === 'number'
            ? HTTP_EXCEPTION_BY_GRPC_STATUS[payload.code] ??
              InternalServerErrorException
            : HTTP_EXCEPTION_BY_RPC_CODE[normalizedCode] ??
              InternalServerErrorException;

    return new ExceptionCtor(
        createBody(normalizedCode, normalizedMessage, payload.details)
    );
}
