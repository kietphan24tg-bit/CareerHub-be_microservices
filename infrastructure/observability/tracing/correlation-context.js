"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindCorrelationContext = bindCorrelationContext;
exports.runWithCorrelationContext = runWithCorrelationContext;
exports.getCorrelationContext = getCorrelationContext;
exports.getActiveTraceIdentifiers = getActiveTraceIdentifiers;
const node_async_hooks_1 = require("node:async_hooks");
const api_1 = require("@opentelemetry/api");
const correlationStorage = new node_async_hooks_1.AsyncLocalStorage();
function bindCorrelationContext(values) {
    correlationStorage.enterWith({
        ...correlationStorage.getStore(),
        ...values
    });
}
function runWithCorrelationContext(values, callback) {
    return correlationStorage.run({
        ...correlationStorage.getStore(),
        ...values
    }, callback);
}
function getCorrelationContext() {
    return correlationStorage.getStore() ?? {};
}
function getActiveTraceIdentifiers() {
    const activeSpan = api_1.trace.getSpan(api_1.context.active());
    const spanContext = activeSpan?.spanContext();
    if (!spanContext) {
        return {};
    }
    return {
        spanId: spanContext.spanId,
        traceId: spanContext.traceId
    };
}
