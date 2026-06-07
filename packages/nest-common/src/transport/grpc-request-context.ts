import type { ExecutionContext } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import {
    ROOT_CONTEXT,
    context as otelContext,
    propagation,
    type Context,
    type TextMapGetter,
    type TextMapSetter
} from '@opentelemetry/api';
import {
    createRpcRequestEnvelope,
    getRequestIdFromRpcPayload,
    REQUEST_ID_HEADER,
    type RpcRequestEnvelope
} from '../request/request-id';

const metadataCarrierGetter: TextMapGetter<Record<string, string>> = {
    get(carrier, key) {
        return carrier[key];
    },
    keys(carrier) {
        return Object.keys(carrier);
    }
};

const metadataCarrierSetter: TextMapSetter<Metadata> = {
    set(carrier, key, value) {
        carrier.set(key, value);
    }
};

export function createGrpcMetadata(requestId?: string): Metadata {
    const metadata = new Metadata();

    if (requestId) {
        metadata.set(REQUEST_ID_HEADER, requestId);
    }

    propagation.inject(otelContext.active(), metadata, metadataCarrierSetter);

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

export function getGrpcMetadataCarrier(metadata: Metadata): Record<string, string> {
    return metadata.getMap() as Record<string, string>;
}

export function extractTraceContextFromGrpcMetadata(
    metadata: Metadata | undefined
): Context {
    if (!metadata) {
        return ROOT_CONTEXT;
    }

    return propagation.extract(
        ROOT_CONTEXT,
        getGrpcMetadataCarrier(metadata),
        metadataCarrierGetter
    );
}

export function getGrpcMetadataFromExecutionContext(
    context: ExecutionContext
): Metadata | undefined {
    const rpcContext = context.switchToRpc().getContext<Metadata | undefined>();

    if (rpcContext instanceof Metadata) {
        return rpcContext;
    }

    const secondArgument = context.getArgByIndex<Metadata | undefined>(1);

    if (secondArgument instanceof Metadata) {
        return secondArgument;
    }

    return undefined;
}

export function getGrpcPatternFromExecutionContext(
    context: ExecutionContext
): string {
    const className = context.getClass().name || 'UnknownController';
    const handlerName = context.getHandler().name || 'unknown';

    return `${className}.${handlerName}`;
}
