"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrpcMetadata = createGrpcMetadata;
exports.getRequestIdFromGrpcMetadata = getRequestIdFromGrpcMetadata;
exports.createGrpcPayloadWithRequestId = createGrpcPayloadWithRequestId;
exports.getRequestIdFromGrpcPayload = getRequestIdFromGrpcPayload;
exports.getGrpcMetadataCarrier = getGrpcMetadataCarrier;
exports.extractTraceContextFromGrpcMetadata = extractTraceContextFromGrpcMetadata;
exports.getGrpcMetadataFromExecutionContext = getGrpcMetadataFromExecutionContext;
exports.getGrpcPatternFromExecutionContext = getGrpcPatternFromExecutionContext;
const grpc_js_1 = require("@grpc/grpc-js");
const api_1 = require("@opentelemetry/api");
const request_id_1 = require("../../runtime/request-context/request-id");
const metadataCarrierGetter = {
    get(carrier, key) {
        return carrier[key];
    },
    keys(carrier) {
        return Object.keys(carrier);
    }
};
const metadataCarrierSetter = {
    set(carrier, key, value) {
        carrier.set(key, value);
    }
};
function createGrpcMetadata(requestId) {
    const metadata = new grpc_js_1.Metadata();
    if (requestId) {
        metadata.set(request_id_1.REQUEST_ID_HEADER, requestId);
    }
    api_1.propagation.inject(api_1.context.active(), metadata, metadataCarrierSetter);
    return metadata;
}
function getRequestIdFromGrpcMetadata(metadata) {
    if (!metadata) {
        return undefined;
    }
    const values = metadata.get(request_id_1.REQUEST_ID_HEADER);
    const firstValue = values[0];
    return typeof firstValue === 'string' && firstValue.length > 0
        ? firstValue
        : undefined;
}
function createGrpcPayloadWithRequestId(payload, requestId) {
    return (0, request_id_1.createRpcRequestEnvelope)(payload, requestId);
}
function getRequestIdFromGrpcPayload(payload) {
    return (0, request_id_1.getRequestIdFromRpcPayload)(payload);
}
function getGrpcMetadataCarrier(metadata) {
    return metadata.getMap();
}
function extractTraceContextFromGrpcMetadata(metadata) {
    if (!metadata) {
        return api_1.ROOT_CONTEXT;
    }
    return api_1.propagation.extract(api_1.ROOT_CONTEXT, getGrpcMetadataCarrier(metadata), metadataCarrierGetter);
}
function getGrpcMetadataFromExecutionContext(context) {
    const rpcContext = context.switchToRpc().getContext();
    if (rpcContext instanceof grpc_js_1.Metadata) {
        return rpcContext;
    }
    const secondArgument = context.getArgByIndex(1);
    if (secondArgument instanceof grpc_js_1.Metadata) {
        return secondArgument;
    }
    return undefined;
}
function getGrpcPatternFromExecutionContext(context) {
    const className = context.getClass().name || 'UnknownController';
    const handlerName = context.getHandler().name || 'unknown';
    return `${className}.${handlerName}`;
}
