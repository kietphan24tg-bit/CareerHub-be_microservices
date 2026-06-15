"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeOpenTelemetry = initializeOpenTelemetry;
exports.getCareerHubTracer = getCareerHubTracer;
exports.startSpan = startSpan;
exports.runWithSpanContext = runWithSpanContext;
exports.getActiveSpan = getActiveSpan;
const api_1 = require("@opentelemetry/api");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const core_1 = require("@opentelemetry/core");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const TRACER_NAME = '@careerhub/nest-common';
const SERVICE_NAME_ATTRIBUTE = 'service.name';
const SERVICE_VERSION_ATTRIBUTE = 'service.version';
let runtime;
function createSampler(config) {
    const samplerName = config.otelTracesSampler ?? 'parentbased_always_on';
    if (samplerName === 'always_off') {
        return new sdk_trace_node_1.AlwaysOffSampler();
    }
    if (samplerName === 'traceidratio') {
        const rawRatio = Number(config.otelTracesSamplerArg ?? '1');
        const ratio = Number.isFinite(rawRatio)
            ? Math.max(0, Math.min(1, rawRatio))
            : 1;
        return new sdk_trace_node_1.ParentBasedSampler({
            root: new sdk_trace_node_1.TraceIdRatioBasedSampler(ratio)
        });
    }
    if (samplerName === 'always_on') {
        return new sdk_trace_node_1.AlwaysOnSampler();
    }
    return new sdk_trace_node_1.ParentBasedSampler({
        root: new sdk_trace_node_1.AlwaysOnSampler()
    });
}
function isValidOtlpEndpoint(value) {
    return typeof value === 'string' && value.length > 0;
}
function initializeOpenTelemetry(config) {
    if (runtime) {
        return runtime;
    }
    if (config.otelEnabled === false ||
        !isValidOtlpEndpoint(config.otelExporterOtlpEndpoint)) {
        runtime = {
            enabled: false,
            shutdown: async () => undefined
        };
        return runtime;
    }
    const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: config.otelExporterOtlpEndpoint
    });
    const provider = new sdk_trace_node_1.NodeTracerProvider({
        resource: (0, resources_1.resourceFromAttributes)({
            [SERVICE_NAME_ATTRIBUTE]: config.otelServiceName ?? config.serviceName,
            [SERVICE_VERSION_ATTRIBUTE]: '0.1.0',
            'deployment.environment.name': config.nodeEnv
        }),
        sampler: createSampler(config),
        spanProcessors: [new sdk_trace_node_1.BatchSpanProcessor(exporter)]
    });
    provider.register({
        contextManager: new context_async_hooks_1.AsyncLocalStorageContextManager(),
        propagator: new core_1.CompositePropagator({
            propagators: [
                new core_1.W3CTraceContextPropagator(),
                new core_1.W3CBaggagePropagator()
            ]
        })
    });
    runtime = {
        enabled: true,
        provider,
        shutdown: async () => {
            await provider.shutdown();
        }
    };
    return runtime;
}
function getCareerHubTracer() {
    return api_1.trace.getTracer(TRACER_NAME);
}
function startSpan(name, options, parentContext) {
    return getCareerHubTracer().startSpan(name, options, parentContext);
}
function runWithSpanContext(span, parentContext, callback) {
    return api_1.context.with(api_1.trace.setSpan(parentContext, span), callback);
}
function getActiveSpan() {
    return api_1.trace.getSpan(api_1.context.active());
}
