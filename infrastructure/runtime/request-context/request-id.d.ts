import type { Request, RequestHandler } from 'express';
export declare const REQUEST_ID_HEADER = "x-request-id";
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
export declare function generateRequestId(): string;
export declare function getRequestIdFromHttpRequest(request: Pick<RequestWithId, 'headers' | 'id'>): string | undefined;
export declare function createRequestIdMiddleware(options?: RequestIdMiddlewareOptions): RequestHandler;
export declare function createRpcRequestEnvelope<TPayload>(payload: TPayload, requestId?: string): RpcRequestEnvelope<TPayload>;
export declare function getRequestIdFromRpcPayload(payload: unknown): string | undefined;
export declare function getPayloadFromRpcEnvelope<TPayload>(payload: TPayload | RpcRequestEnvelope<TPayload>): TPayload;
export {};
