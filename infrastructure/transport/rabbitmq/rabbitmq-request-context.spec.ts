import assert from 'node:assert/strict';
import test from 'node:test';
import { RmqContext } from '@nestjs/microservices';
import {
    ROOT_CONTEXT,
    SpanKind,
    context,
    trace
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import type { ExecutionContext } from '@nestjs/common';
import {
    createRabbitMqHeaders,
    createRabbitMqMessageOptions,
    extractTraceContextFromRabbitMqProperties,
    getRabbitMqExchangeFromExecutionContext,
    getRabbitMqPatternFromExecutionContext,
    getRabbitMqPropertiesFromExecutionContext,
    getRabbitMqRoutingKeyFromExecutionContext,
    getRequestIdFromRabbitMqProperties
} from './rabbitmq-request-context';

function createRabbitMqExecutionContext(
    pattern: string,
    message: Record<string, unknown>
): ExecutionContext {
    const rmqContext = new RmqContext([message, {}, pattern]);

    return {
        getArgs: () => [{}, rmqContext],
        getArgByIndex: (index: number) => [{}, rmqContext][index],
        getClass: () => class TestConsumer {},
        getHandler: () => function handle() {},
        getType: () => 'rpc',
        switchToHttp: () => ({
            getNext: () => undefined,
            getRequest: () => undefined,
            getResponse: () => undefined
        }),
        switchToRpc: () => ({
            getContext: () => rmqContext,
            getData: () => ({})
        }),
        switchToWs: () => ({
            getClient: () => undefined,
            getData: () => undefined,
            getPattern: () => undefined
        })
    } as unknown as ExecutionContext;
}

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

test('rabbitmq helpers extract execution context metadata safely', () => {
    const message = {
        fields: {
            exchange: 'careerhub.events',
            routingKey: 'gateway.cache.invalidated.v1'
        },
        properties: createRabbitMqMessageOptions('req-rmq-002')
    };
    const context = createRabbitMqExecutionContext(
        'gateway.cache.invalidated.v1',
        message
    );

    assert.equal(
        getRabbitMqPatternFromExecutionContext(context),
        'gateway.cache.invalidated.v1'
    );
    assert.equal(
        getRabbitMqExchangeFromExecutionContext(context),
        'careerhub.events'
    );
    assert.equal(
        getRabbitMqRoutingKeyFromExecutionContext(context),
        'gateway.cache.invalidated.v1'
    );
    assert.equal(
        getRequestIdFromRabbitMqProperties(
            getRabbitMqPropertiesFromExecutionContext(context)
        ),
        'req-rmq-002'
    );
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
