import assert from 'node:assert/strict';
import test from 'node:test';
import { RmqContext } from '@nestjs/microservices';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { MetricsRegistry } from '../../../metrics/metrics.types';
import { RabbitMqMetricsInterceptor } from '../rabbitmq-metrics.interceptor';

function createRpcExecutionContext(pattern: string): ExecutionContext {
    const rmqContext = new RmqContext([
        {
            fields: {
                exchange: 'careerhub.events',
                routingKey: pattern
            },
            properties: {
                headers: {}
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
        switchToHttp: () => ({ getRequest: () => undefined, getResponse: () => undefined, getNext: () => undefined }),
        switchToRpc: () => ({ getContext: () => rmqContext, getData: () => ({}) }),
        switchToWs: () => ({
            getClient: () => undefined,
            getData: () => undefined,
            getPattern: () => undefined
        })
    } as unknown as ExecutionContext;
}

test('records RabbitMQ success metrics', async () => {
    const recorded: Array<{ type: string; pattern: string; status: string; durationMs: number }> = [];
    const metrics: MetricsRegistry = {
        recordHttpError() {},
        recordHttpRequest() {},
        recordIntegrationConsumer() {},
        recordOutboxBacklog() {},
        recordOutboxCleanup() {},
        recordOutboxPublish() {},
        recordRmqError() {},
        recordRmqRequest(record) {
            recorded.push({ type: 'request', ...record });
        },
        recordRpcError() {},
        recordRpcRequest() {},
        renderPrometheus() {
            return '';
        }
    };
    const interceptor = new RabbitMqMetricsInterceptor(metrics, {
        queue: 'gateway.events',
        serviceName: 'gateway'
    });

    await lastValueFrom(
        interceptor.intercept(
            createRpcExecutionContext('gateway.cache.invalidated.v1'),
            {
                handle: () => of({ ok: true })
            } as CallHandler
        )
    );

    assert.equal(recorded.length, 1);
    assert.equal(recorded[0]?.pattern, 'gateway.cache.invalidated.v1');
    assert.equal(recorded[0]?.status, 'success');
});

test('records RabbitMQ error metrics', async () => {
    const recorded: Array<{ type: string; pattern: string; status: string; durationMs: number }> = [];
    const metrics: MetricsRegistry = {
        recordHttpError() {},
        recordHttpRequest() {},
        recordIntegrationConsumer() {},
        recordOutboxBacklog() {},
        recordOutboxCleanup() {},
        recordOutboxPublish() {},
        recordRmqError(record) {
            recorded.push({ type: 'error', ...record });
        },
        recordRmqRequest(record) {
            recorded.push({ type: 'request', ...record });
        },
        recordRpcError() {},
        recordRpcRequest() {},
        renderPrometheus() {
            return '';
        }
    };
    const interceptor = new RabbitMqMetricsInterceptor(metrics);

    await assert.rejects(
        () =>
            lastValueFrom(
                interceptor.intercept(
                    createRpcExecutionContext('candidate.profile.created.v1'),
                    {
                        handle: () => throwError(() => new Error('rmq failed'))
                    } as CallHandler
                )
            ),
        /rmq failed/
    );

    assert.equal(recorded.length, 2);
    assert.equal(recorded[0]?.type, 'request');
    assert.equal(recorded[0]?.status, 'error');
    assert.equal(recorded[1]?.type, 'error');
    assert.equal(recorded[1]?.pattern, 'candidate.profile.created.v1');
});
