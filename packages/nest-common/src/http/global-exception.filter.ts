import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { mapErrorToHttpException } from './http-error.mapper';
import type { HttpErrorResponse } from './http-error-response';
import {
    getRequestIdFromHttpRequest,
    type RequestWithId
} from '../request/request-id';

type ExceptionResponseBody = {
    code?: string;
    details?: unknown;
    message?: string | string[];
    statusCode?: number;
};

type NormalizedExceptionResponse = {
    code: string;
    details?: unknown;
    message: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<RequestWithId>();
        const httpException = mapErrorToHttpException(exception);
        const status = httpException.getStatus();
        const exceptionResponse = httpException.getResponse();
        const normalized = this.normalizeResponse(exceptionResponse, status);
        const requestId = getRequestIdFromHttpRequest(request);

        response.status(status).json({
            success: false,
            error: {
                code: normalized.code,
                details: normalized.details,
                message: normalized.message
            },
            statusCode: status,
            path: request.url,
            requestId,
            timestamp: new Date().toISOString()
        } satisfies HttpErrorResponse);
    }

    private normalizeResponse(
        response: string | object,
        status: number
    ): NormalizedExceptionResponse {
        if (typeof response === 'string') {
            return {
                code: this.defaultCode(status),
                message: response
            };
        }

        const body = response as ExceptionResponseBody;
        const normalizedMessage = Array.isArray(body.message)
            ? 'Request validation failed'
            : body.message ?? 'Request failed';

        return {
            code: body.code ?? this.defaultCode(body.statusCode ?? status),
            details: body.details ?? (Array.isArray(body.message) ? body.message : undefined),
            message: normalizedMessage
        };
    }

    private defaultCode(status: number): string {
        if (status === HttpStatus.BAD_REQUEST) {
            return 'BAD_REQUEST';
        }

        if (status === HttpStatus.UNAUTHORIZED) {
            return 'UNAUTHORIZED';
        }

        if (status === HttpStatus.FORBIDDEN) {
            return 'FORBIDDEN';
        }

        if (status === HttpStatus.NOT_FOUND) {
            return 'NOT_FOUND';
        }

        if (status === HttpStatus.CONFLICT) {
            return 'CONFLICT';
        }

        return 'INTERNAL_SERVER_ERROR';
    }
}
