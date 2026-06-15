import { type Span, type SpanKind, type SpanOptions, type Context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
type OpenTelemetryRuntime = {
    enabled: boolean;
    provider?: NodeTracerProvider;
    shutdown: () => Promise<void>;
};
export declare function initializeOpenTelemetry(config: Pick<RuntimeConfig, 'nodeEnv' | 'otelEnabled' | 'otelExporterOtlpEndpoint' | 'otelServiceName' | 'otelTracesSampler' | 'otelTracesSamplerArg' | 'serviceName'>): OpenTelemetryRuntime;
export declare function getCareerHubTracer(): import("@opentelemetry/api").Tracer;
export declare function startSpan(name: string, options?: SpanOptions, parentContext?: Context): Span;
export declare function runWithSpanContext<TValue>(span: Span, parentContext: Context, callback: () => TValue): TValue;
export declare function getActiveSpan(): Span | undefined;
export type { SpanKind, SpanOptions, Context };
