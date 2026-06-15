"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_ID_HEADER = void 0;
exports.generateRequestId = generateRequestId;
exports.getRequestIdFromHttpRequest = getRequestIdFromHttpRequest;
exports.createRequestIdMiddleware = createRequestIdMiddleware;
exports.createRpcRequestEnvelope = createRpcRequestEnvelope;
exports.getRequestIdFromRpcPayload = getRequestIdFromRpcPayload;
exports.getPayloadFromRpcEnvelope = getPayloadFromRpcEnvelope;
const crypto_1 = require("crypto");
exports.REQUEST_ID_HEADER = 'x-request-id';
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function generateRequestId() {
    return (0, crypto_1.randomUUID)();
}
function getRequestIdFromHttpRequest(request) {
    const headerValue = request.headers[exports.REQUEST_ID_HEADER];
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
function createRequestIdMiddleware(options) {
    const headerName = options?.headerName ?? exports.REQUEST_ID_HEADER;
    const generator = options?.generator ?? generateRequestId;
    return (request, response, next) => {
        const incomingRequestId = typeof request.headers[headerName] === 'string'
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
function createRpcRequestEnvelope(payload, requestId) {
    return {
        payload,
        requestId
    };
}
function getRequestIdFromRpcPayload(payload) {
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
function getPayloadFromRpcEnvelope(payload) {
    if (isObject(payload) && 'payload' in payload) {
        return payload.payload;
    }
    return payload;
}
