import {
    context,
    propagation,
    trace,
    type Span,
    type SpanKind,
    type SpanOptions,
    type Context
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
    CompositePropagator,
    W3CBaggagePropagator,
    W3CTraceContextPropagator
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
    BatchSpanProcessor,
    NodeTracerProvider,
    ParentBasedSampler,
    TraceIdRatioBasedSampler,
    AlwaysOffSampler,
    AlwaysOnSampler,
    type Sampler
} from '@opentelemetry/sdk-trace-node';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';

const TRACER_NAME = '@careerhub/nest-common';
const SERVICE_NAME_ATTRIBUTE = 'service.name';
const SERVICE_VERSION_ATTRIBUTE = 'service.version';

type OpenTelemetryRuntime = {
    enabled: boolean;
    provider?: NodeTracerProvider;
    shutdown: () => Promise<void>;
};

let runtime: OpenTelemetryRuntime | undefined;

function createSampler(config: Pick<
    RuntimeConfig,
    'otelTracesSampler' | 'otelTracesSamplerArg'
>): Sampler {
    const samplerName = config.otelTracesSampler ?? 'parentbased_always_on';

    if (samplerName === 'always_off') {
        return new AlwaysOffSampler();
    }

    if (samplerName === 'traceidratio') {
        const rawRatio = Number(config.otelTracesSamplerArg ?? '1');
        const ratio = Number.isFinite(rawRatio)
            ? Math.max(0, Math.min(1, rawRatio))
            : 1;

        return new ParentBasedSampler({
            root: new TraceIdRatioBasedSampler(ratio)
        });
    }

    if (samplerName === 'always_on') {
        return new AlwaysOnSampler();
    }

    return new ParentBasedSampler({
        root: new AlwaysOnSampler()
    });
}

function isValidOtlpEndpoint(value: string | undefined): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function initializeOpenTelemetry(
    config: Pick<
        RuntimeConfig,
        | 'nodeEnv'
        | 'otelEnabled'
        | 'otelExporterOtlpEndpoint'
        | 'otelServiceName'
        | 'otelTracesSampler'
        | 'otelTracesSamplerArg'
        | 'serviceName'
    >
): OpenTelemetryRuntime {
    if (runtime) {
        return runtime;
    }

    if (
        config.otelEnabled === false ||
        !isValidOtlpEndpoint(config.otelExporterOtlpEndpoint)
    ) {
        runtime = {
            enabled: false,
            shutdown: async () => undefined
        };

        return runtime;
    }

    const exporter = new OTLPTraceExporter({
        url: config.otelExporterOtlpEndpoint
    });
    const provider = new NodeTracerProvider({
        resource: resourceFromAttributes({
            [SERVICE_NAME_ATTRIBUTE]:
                config.otelServiceName ?? config.serviceName,
            [SERVICE_VERSION_ATTRIBUTE]: '0.1.0',
            'deployment.environment.name': config.nodeEnv
        }),
        sampler: createSampler(config),
        spanProcessors: [new BatchSpanProcessor(exporter)]
    });

    provider.register({
        contextManager: new AsyncLocalStorageContextManager(),
        propagator: new CompositePropagator({
            propagators: [
                new W3CTraceContextPropagator(),
                new W3CBaggagePropagator()
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

export function getCareerHubTracer() {
    return trace.getTracer(TRACER_NAME);
}

export function startSpan(
    name: string,
    options?: SpanOptions,
    parentContext?: Context
): Span {
    return getCareerHubTracer().startSpan(name, options, parentContext);
}

export function runWithSpanContext<TValue>(
    span: Span,
    parentContext: Context,
    callback: () => TValue
): TValue {
    return context.with(trace.setSpan(parentContext, span), callback);
}

export function getActiveSpan() {
    return trace.getSpan(context.active());
}

export type { SpanKind, SpanOptions, Context };
