import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ROOT_CONTEXT,
    SpanKind,
    context,
    trace
} from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
    createGrpcMetadata,
    extractTraceContextFromGrpcMetadata,
    getRequestIdFromGrpcMetadata
} from './grpc-request-context';

test('grpc metadata keeps request id and trace context', () => {
    const exporter = new InMemorySpanExporter();
    const provider = new NodeTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(exporter)]
    });

    provider.register();

    const tracer = trace.getTracer('test');
    const parentSpan = tracer.startSpan('parent', {
        kind: SpanKind.INTERNAL
    });

    context.with(trace.setSpan(ROOT_CONTEXT, parentSpan), () => {
        const metadata = createGrpcMetadata('req-otel-001');
        const extractedContext = extractTraceContextFromGrpcMetadata(metadata);
        const extractedSpanContext = trace
            .getSpanContext(extractedContext)
            ?.traceId;

        assert.equal(getRequestIdFromGrpcMetadata(metadata), 'req-otel-001');
        assert.ok(metadata.get('traceparent').length > 0);
        assert.equal(extractedSpanContext, parentSpan.spanContext().traceId);
    });

    parentSpan.end();
});
