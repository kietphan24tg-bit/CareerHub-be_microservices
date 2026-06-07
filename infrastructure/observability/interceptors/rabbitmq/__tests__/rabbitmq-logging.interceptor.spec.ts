import assert from 'node:assert/strict';
import test from 'node:test';
import { RmqContext } from '@nestjs/microservices';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { RabbitMqLoggingInterceptor } from '../rabbitmq-logging.interceptor';
import type { RuntimeLogger } from '../../../logging/runtime-logger';

function createRpcExecutionContext(
    pattern: string,
    requestId?: string
): ExecutionContext {
    const rmqContext = new RmqContext([
        {
            fields: {
                exchange: 'careerhub.events',
                routingKey: pattern
            },
            properties: {
                headers: requestId ? { 'x-request-id': requestId } : {}
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

test('rabbitmq logging interceptor logs request start and complete with request id', async () => {
    const events: Array<{ details?: unknown; message: string; pattern?: string; requestId?: string }> = [];
    const logger = {
        logRpcRequestComplete: (context: { details?: unknown; pattern?: string; requestId?: string }) =>
            events.push({ message: 'complete', ...context }),
        logRpcRequestError: () => undefined,
        logRpcRequestStart: (context: { details?: unknown; pattern?: string; requestId?: string }) =>
            events.push({ message: 'start', ...context })
    } as unknown as RuntimeLogger;

    await lastValueFrom(
        new RabbitMqLoggingInterceptor(logger, {
            queue: 'gateway.events'
        }).intercept(
            createRpcExecutionContext('gateway.cache.invalidated.v1', 'req-rmq-003'),
            {
                handle: () => of({ ok: true })
            } as CallHandler
        )
    );

    assert.deepEqual(events[0], {
        details: {
            exchange: 'careerhub.events',
            queue: 'gateway.events',
            routingKey: 'gateway.cache.invalidated.v1'
        },
        context: 'RabbitMqLoggingInterceptor',
        message: 'start',
        pattern: 'gateway.cache.invalidated.v1',
        requestId: 'req-rmq-003'
    });
    assert.equal(events[1]?.message, 'complete');
});

test('rabbitmq logging interceptor logs error path', async () => {
    let capturedPattern: string | undefined;
    const logger = {
        logRpcRequestComplete: () => undefined,
        logRpcRequestError: (context: { pattern?: string }) => {
            capturedPattern = context.pattern;
        },
        logRpcRequestStart: () => undefined
    } as unknown as RuntimeLogger;

    await assert.rejects(
        () =>
            lastValueFrom(
                new RabbitMqLoggingInterceptor(logger).intercept(
                    createRpcExecutionContext('candidate.profile.created.v1'),
                    {
                        handle: () => throwError(() => new Error('rmq failed'))
                    } as CallHandler
                )
            ),
        /rmq failed/
    );

    assert.equal(capturedPattern, 'candidate.profile.created.v1');
});
