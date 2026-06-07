import assert from 'node:assert/strict';
import test from 'node:test';
import { RmqContext } from '@nestjs/microservices';
import {
    ROOT_CONTEXT,
    SpanKind,
    context,
    trace
} from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { of, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { createRabbitMqHeaders } from '../../../../transport/rabbitmq/rabbitmq-request-context';
import { RabbitMqTracingInterceptor } from '../rabbitmq-tracing.interceptor';

function createRpcExecutionContext(
    pattern: string,
    headers: Record<string, unknown>
): ExecutionContext {
    const rmqContext = new RmqContext([
        {
            fields: {
                exchange: 'careerhub.events',
                routingKey: pattern
            },
            properties: {
                headers
            }
        },
        {},
        pattern
    ]);

    return {
        getArgs: () => [{}, rmqContext],
        getArgByIndex: (index: number) => [{}, rmqContext][index],
        getClass: () => class TestConsumer {},
        getHandler: () => function handle() {},
        getType: () => 'rpc',
        switchToHttp: () => ({ getNext: () => undefined, getRequest: () => undefined, getResponse: () => undefined }),
        switchToRpc: () => ({ getContext: () => rmqContext, getData: () => ({}) }),
        switchToWs: () => ({
            getClient: () => undefined,
            getData: () => undefined,
            getPattern: () => undefined
        })
    } as unknown as ExecutionContext;
}

test('rabbitmq tracing interceptor creates consumer span from parent headers', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new NodeTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(exporter)]
    });

    provider.register();

    const tracer = trace.getTracer('test');
    const parentSpan = tracer.startSpan('publisher', {
        kind: SpanKind.PRODUCER
    });
    let headers: Record<string, unknown> = {};

    context.with(trace.setSpan(ROOT_CONTEXT, parentSpan), () => {
        headers = createRabbitMqHeaders('req-rmq-004') ?? {};
    });

    await lastValueFrom(
        new RabbitMqTracingInterceptor().intercept(
            createRpcExecutionContext('gateway.cache.invalidated.v1', headers),
            {
                handle: () => of({ ok: true })
            } as CallHandler
        )
    );

    parentSpan.end();

    const spans = exporter.getFinishedSpans();
    const consumerSpan = spans.find(
        (span) => span.name === 'gateway.cache.invalidated.v1'
    );

    assert.ok(consumerSpan);
    assert.equal(consumerSpan?.parentSpanContext?.traceId, parentSpan.spanContext().traceId);
    assert.equal(
        consumerSpan?.attributes['messaging.system'],
        'rabbitmq'
    );
});
