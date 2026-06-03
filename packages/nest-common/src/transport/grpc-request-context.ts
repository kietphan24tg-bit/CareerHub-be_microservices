import { Metadata } from '@grpc/grpc-js';
import {
    createRpcRequestEnvelope,
    getRequestIdFromRpcPayload,
    REQUEST_ID_HEADER,
    type RpcRequestEnvelope
} from '../request/request-id';

export function createGrpcMetadata(requestId?: string): Metadata {
    const metadata = new Metadata();

    if (requestId) {
        metadata.set(REQUEST_ID_HEADER, requestId);
    }

    return metadata;
}

export function getRequestIdFromGrpcMetadata(
    metadata: Metadata | undefined
): string | undefined {
    if (!metadata) {
        return undefined;
    }

    const values = metadata.get(REQUEST_ID_HEADER);
    const firstValue = values[0];

    return typeof firstValue === 'string' && firstValue.length > 0
        ? firstValue
        : undefined;
}

export function createGrpcPayloadWithRequestId<TPayload>(
    payload: TPayload,
    requestId?: string
): RpcRequestEnvelope<TPayload> {
    return createRpcRequestEnvelope(payload, requestId);
}

export function getRequestIdFromGrpcPayload(payload: unknown): string | undefined {
    return getRequestIdFromRpcPayload(payload);
}
