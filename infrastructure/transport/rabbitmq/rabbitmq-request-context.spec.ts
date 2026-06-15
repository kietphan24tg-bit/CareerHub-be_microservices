import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ROOT_CONTEXT,
    SpanKind,
    context,
    trace
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
    createRabbitMqHeaders,
    extractTraceContextFromRabbitMqProperties,
    getRequestIdFromRabbitMqProperties
} from './rabbitmq-request-context';

test('rabbitmq headers keep request id and trace context', () => {
    const provider = new NodeTracerProvider();

    provider.register();

    const tracer = trace.getTracer('test');
    const parentSpan = tracer.startSpan('parent', {
        kind: SpanKind.INTERNAL
    });

    context.with(trace.setSpan(ROOT_CONTEXT, parentSpan), () => {
        const headers = createRabbitMqHeaders('req-rmq-001');
        const extractedContext = extractTraceContextFromRabbitMqProperties({
            headers
        });
        const extractedSpanContext = trace
            .getSpanContext(extractedContext)
            ?.traceId;

        assert.equal(
            getRequestIdFromRabbitMqProperties({
                headers
            }),
            'req-rmq-001'
        );
        assert.equal(typeof headers?.traceparent, 'string');
        assert.equal(extractedSpanContext, parentSpan.spanContext().traceId);
    });

    parentSpan.end();
});

test('rabbitmq helpers tolerate missing headers', () => {
    assert.equal(getRequestIdFromRabbitMqProperties(undefined), undefined);
    assert.equal(
        trace.getSpanContext(
            extractTraceContextFromRabbitMqProperties(undefined)
        ),
        undefined
    );
});
