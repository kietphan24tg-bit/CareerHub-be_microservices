import { randomUUID } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithId = Request & {
    id?: string;
};

export type RpcRequestEnvelope<TPayload = unknown> = {
    payload: TPayload;
    requestId?: string;
};

type RequestIdMiddlewareOptions = {
    generator?: () => string;
    headerName?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function generateRequestId(): string {
    return randomUUID();
}

export function getRequestIdFromHttpRequest(
    request: Pick<RequestWithId, 'headers' | 'id'>
): string | undefined {
    const headerValue = request.headers[REQUEST_ID_HEADER];

    if (typeof request.id === 'string' && request.id.length > 0) {
        return request.id;
    }

    if (typeof headerValue === 'string' && headerValue.length > 0) {
        return headerValue;
    }

    if (Array.isArray(headerValue) && headerValue.length > 0) {
        return headerValue[0];
    }

    return undefined;
}

export function createRequestIdMiddleware(
    options?: RequestIdMiddlewareOptions
): RequestHandler {
    const headerName = options?.headerName ?? REQUEST_ID_HEADER;
    const generator = options?.generator ?? generateRequestId;

    return (request: RequestWithId, response: Response, next: NextFunction) => {
        const incomingRequestId =
            typeof request.headers[headerName] === 'string'
                ? request.headers[headerName]
                : Array.isArray(request.headers[headerName])
                  ? request.headers[headerName][0]
                  : undefined;
        const requestId = incomingRequestId?.trim() || generator();

        request.id = requestId;
        response.setHeader(headerName, requestId);
        next();
    };
}

export function createRpcRequestEnvelope<TPayload>(
    payload: TPayload,
    requestId?: string
): RpcRequestEnvelope<TPayload> {
    return {
        payload,
        requestId
    };
}

export function getRequestIdFromRpcPayload(payload: unknown): string | undefined {
    if (!isObject(payload)) {
        return undefined;
    }

    if (typeof payload.requestId === 'string' && payload.requestId.length > 0) {
        return payload.requestId;
    }

    const metadata = payload.metadata;

    if (isObject(metadata) && typeof metadata.requestId === 'string') {
        return metadata.requestId;
    }

    return undefined;
}

export function getPayloadFromRpcEnvelope<TPayload>(
    payload: TPayload | RpcRequestEnvelope<TPayload>
): TPayload {
    if (isObject(payload) && 'payload' in payload) {
        return (payload as RpcRequestEnvelope<TPayload>).payload;
    }

    return payload as TPayload;
}
