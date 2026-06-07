import assert from 'node:assert/strict';
import test from 'node:test';
import { SpanKind, context, trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { RuntimeLogger } from './runtime-logger';
import { bindCorrelationContext } from '../tracing/correlation-context';

test('runtime logger enriches json logs with request and trace identifiers', () => {
    const provider = new NodeTracerProvider();
    provider.register();

    const tracer = trace.getTracer('runtime-logger-spec');
    const span = tracer.startSpan('log-span', {
        kind: SpanKind.INTERNAL
    });
    const originalConsoleLog = console.log;
    let capturedOutput = '';

    console.log = (message?: unknown) => {
        capturedOutput = String(message ?? '');
    };

    try {
        context.with(trace.setSpan(context.active(), span), () => {
            bindCorrelationContext({
                requestId: 'req-log-001'
            });

            const logger = new RuntimeLogger({
                level: 'info',
                pretty: false,
                serviceName: 'test-service'
            });

            logger.info('hello world');
        });
    } finally {
        span.end();
        console.log = originalConsoleLog;
    }

    const parsed = JSON.parse(capturedOutput) as {
        requestId?: string;
        spanId?: string;
        traceId?: string;
    };

    assert.equal(parsed.requestId, 'req-log-001');
    assert.equal(parsed.traceId, span.spanContext().traceId);
    assert.equal(parsed.spanId, span.spanContext().spanId);
});
