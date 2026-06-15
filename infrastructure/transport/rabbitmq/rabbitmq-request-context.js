"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRabbitMqHeaders = createRabbitMqHeaders;
exports.createRabbitMqMessageOptions = createRabbitMqMessageOptions;
exports.getRabbitMqHeaders = getRabbitMqHeaders;
exports.getRequestIdFromRabbitMqProperties = getRequestIdFromRabbitMqProperties;
exports.extractTraceContextFromRabbitMqProperties = extractTraceContextFromRabbitMqProperties;
const api_1 = require("@opentelemetry/api");
const request_id_1 = require("../../runtime/request-context/request-id");
const rabbitMqHeaderGetter = {
    get(carrier, key) {
        const value = carrier[key];
        if (Array.isArray(value)) {
            return value
                .filter((item) => typeof item === 'string')
                .map((item) => item);
        }
        return typeof value === 'string' ? value : undefined;
    },
    keys(carrier) {
        return Object.keys(carrier);
    }
};
const rabbitMqHeaderSetter = {
    set(carrier, key, value) {
        carrier[key] = value;
    }
};
function createRabbitMqHeaders(requestId, parentContext = api_1.context.active()) {
    const headers = {};
    if (requestId) {
        headers[request_id_1.REQUEST_ID_HEADER] = requestId;
    }
    api_1.propagation.inject(parentContext, headers, rabbitMqHeaderSetter);
    return Object.keys(headers).length > 0 ? headers : undefined;
}
function createRabbitMqMessageOptions(requestId, parentContext) {
    const headers = createRabbitMqHeaders(requestId, parentContext);
    return headers ? { headers } : undefined;
}
function getRabbitMqHeaders(properties) {
    return properties?.headers ?? {};
}
function getRequestIdFromRabbitMqProperties(properties) {
    const headerValue = getRabbitMqHeaders(properties)[request_id_1.REQUEST_ID_HEADER];
    return typeof headerValue === 'string' && headerValue.length > 0
        ? headerValue
        : undefined;
}
function extractTraceContextFromRabbitMqProperties(properties) {
    if (!properties?.headers) {
        return api_1.ROOT_CONTEXT;
    }
    return api_1.propagation.extract(api_1.ROOT_CONTEXT, properties.headers, rabbitMqHeaderGetter);
}
