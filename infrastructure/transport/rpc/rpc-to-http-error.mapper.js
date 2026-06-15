"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRpcErrorToHttpException = mapRpcErrorToHttpException;
const common_1 = require("@nestjs/common");
const HTTP_EXCEPTION_BY_RPC_CODE = {
    ALREADY_EXISTS: common_1.ConflictException,
    APPLICATION_NOT_FOUND: common_1.NotFoundException,
    BAD_REQUEST: common_1.BadRequestException,
    CONFLICT: common_1.ConflictException,
    DUPLICATE_APPLICATION: common_1.ConflictException,
    FORBIDDEN: common_1.ForbiddenException,
    FORBIDDEN_APPLICATION_ACCESS: common_1.ForbiddenException,
    INVALID_APPLICATION_STATUS_TRANSITION: common_1.BadRequestException,
    INVALID_ARGUMENT: common_1.BadRequestException,
    INVALID_CONFIGURATION: common_1.InternalServerErrorException,
    INTERNAL: common_1.InternalServerErrorException,
    NOT_FOUND: common_1.NotFoundException,
    PERMISSION_DENIED: common_1.ForbiddenException,
    UNAUTHENTICATED: common_1.UnauthorizedException,
    UNAUTHORIZED: common_1.UnauthorizedException,
    VALIDATION_ERROR: common_1.BadRequestException
};
const HTTP_EXCEPTION_BY_GRPC_STATUS = {
    3: common_1.BadRequestException,
    5: common_1.NotFoundException,
    6: common_1.ConflictException,
    7: common_1.ForbiddenException,
    13: common_1.InternalServerErrorException,
    16: common_1.UnauthorizedException
};
function looksLikeTokenAuthFailure(code, message, details) {
    if (code !== 'UNKNOWN' && code !== 2) {
        return false;
    }
    const detailsText = typeof details === 'string' ? details : '';
    const haystack = `${message} ${detailsText}`.toLowerCase();
    return haystack.includes('invalid refresh token') || haystack.includes('invalid access token');
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function createBody(code, message, details) {
    return {
        code,
        details,
        message
    };
}
function parseGrpcMessage(message) {
    const match = message.match(/^\d+\s+([A-Z_]+):\s+(.+)$/);
    if (!match) {
        return { message };
    }
    return {
        code: match[1],
        message: match[2]
    };
}
function normalizeRpcErrorPayload(error) {
    if (typeof error === 'string') {
        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: error
        };
    }
    if (isObject(error)) {
        const payload = error;
        const nestedError = payload.error;
        if (nestedError !== undefined && nestedError !== error) {
            return normalizeRpcErrorPayload(nestedError);
        }
        const code = typeof payload.code === 'number'
            ? payload.code
            : typeof payload.code === 'string' && payload.code.length > 0
                ? payload.code
                : 'INTERNAL_SERVER_ERROR';
        const message = typeof payload.message === 'string' && payload.message.length > 0
            ? payload.message
            : 'An unexpected error occurred';
        return {
            code,
            details: payload.details,
            message
        };
    }
    if (error instanceof Error) {
        const maybePayload = error;
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
function mapRpcErrorToHttpException(error) {
    if (error instanceof common_1.HttpException) {
        return error;
    }
    const payload = normalizeRpcErrorPayload(error);
    const parsedMessage = parseGrpcMessage(payload.message);
    const normalizedMessage = parsedMessage.message;
    const tokenAuthFailure = looksLikeTokenAuthFailure(payload.code, normalizedMessage, payload.details);
    const normalizedCode = tokenAuthFailure
        ? 'UNAUTHORIZED'
        : typeof payload.code === 'number'
            ? parsedMessage.code ?? `GRPC_${payload.code}`
            : payload.code;
    const ExceptionCtor = tokenAuthFailure
        ? common_1.UnauthorizedException
        : typeof payload.code === 'number'
            ? HTTP_EXCEPTION_BY_GRPC_STATUS[payload.code] ??
                common_1.InternalServerErrorException
            : HTTP_EXCEPTION_BY_RPC_CODE[normalizedCode] ??
                common_1.InternalServerErrorException;
    return new ExceptionCtor(createBody(normalizedCode, normalizedMessage, payload.details));
}
