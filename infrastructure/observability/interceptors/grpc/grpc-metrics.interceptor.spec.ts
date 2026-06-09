import assert from 'node:assert/strict';
import test from 'node:test';
import { of, throwError } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { MetricsRegistry } from '../../metrics/metrics.types';
import { GrpcMetricsInterceptor } from './grpc-metrics.interceptor';

function createRpcExecutionContext(
    controllerName: string,
    handlerName: string
): ExecutionContext {
    const controller = {
        [controllerName]: class {}
    }[controllerName] as new () => unknown;
    const handler = {
        [handlerName]() {}
    }[handlerName] as () => void;

    return {
        getArgs: () => [],
        getArgByIndex: () => undefined,
        getClass: () => controller,
        getHandler: () => handler,
        getType: () => 'rpc',
        switchToHttp: () => ({ getRequest: () => undefined, getResponse: () => undefined, getNext: () => undefined }),
        switchToRpc: () => ({ getContext: () => undefined, getData: () => undefined }),
        switchToWs: () => ({
            getClient: () => undefined,
            getData: () => undefined,
            getPattern: () => undefined
        })
    } as unknown as ExecutionContext;
}

test('records RPC success metrics', async () => {
    const recorded: Array<{ type: string; pattern: string; status: string; durationMs: number }> = [];
    const metrics: MetricsRegistry = {
        recordHttpError() {},
        recordHttpRequest() {},
        recordIntegrationConsumer() {},
        recordOutboxBacklog() {},
        recordOutboxCleanup() {},
        recordOutboxPublish() {},
        recordRmqError() {},
        recordRmqRequest() {},
        recordRpcError() {},
        recordRpcRequest(record) {
            recorded.push({ type: 'request', ...record });
        },
        renderPrometheus() {
            return '';
        }
    };
    const interceptor = new GrpcMetricsInterceptor(metrics);

    await lastValueFrom(
        interceptor.intercept(
            createRpcExecutionContext('CandidateGrpcController', 'getProfile'),
            {
                handle: () => of({ ok: true })
            } as CallHandler
        )
    );

    assert.equal(recorded.length, 1);
    assert.equal(recorded[0]?.pattern, 'CandidateGrpcController.getProfile');
    assert.equal(recorded[0]?.status, 'success');
});

test('records RPC error metrics', async () => {
    const recorded: Array<{ type: string; pattern: string; status: string; durationMs: number }> = [];
    const metrics: MetricsRegistry = {
        recordHttpError() {},
        recordHttpRequest() {},
        recordIntegrationConsumer() {},
        recordOutboxBacklog() {},
        recordOutboxCleanup() {},
        recordOutboxPublish() {},
        recordRmqError() {},
        recordRmqRequest() {},
        recordRpcError(record) {
            recorded.push({ type: 'error', ...record });
        },
        recordRpcRequest(record) {
            recorded.push({ type: 'request', ...record });
        },
        renderPrometheus() {
            return '';
        }
    };
    const interceptor = new GrpcMetricsInterceptor(metrics);

    await assert.rejects(
        () =>
            lastValueFrom(
                interceptor.intercept(
                    createRpcExecutionContext('EmployerGrpcController', 'updateProfile'),
                    {
                        handle: () => throwError(() => new Error('rpc failed'))
                    } as CallHandler
                )
            ),
        /rpc failed/
    );

    assert.equal(recorded.length, 2);
    assert.equal(recorded[0]?.type, 'request');
    assert.equal(recorded[0]?.status, 'error');
    assert.equal(recorded[1]?.type, 'error');
    assert.equal(recorded[1]?.pattern, 'EmployerGrpcController.updateProfile');
});
