import assert from 'node:assert/strict';
import test from 'node:test';
import { Metadata } from '@grpc/grpc-js';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { GrpcLoggingInterceptor } from './grpc-logging.interceptor';
import type { RuntimeLogger } from '../../logging/runtime-logger';

function createRpcExecutionContext(
    controllerName: string,
    handlerName: string,
    metadata: Metadata,
    payload: Record<string, unknown>
): ExecutionContext {
    const controller = {
        [controllerName]: class {}
    }[controllerName] as new () => unknown;
    const handler = {
        [handlerName]() {}
    }[handlerName] as () => void;

    return {
        getArgs: () => [payload, metadata],
        getArgByIndex: (index: number) => [payload, metadata][index],
        getClass: () => controller,
        getHandler: () => handler,
        getType: () => 'rpc',
        switchToHttp: () => ({ getNext: () => undefined, getRequest: () => undefined, getResponse: () => undefined }),
        switchToRpc: () => ({ getContext: () => metadata, getData: () => payload }),
        switchToWs: () => ({
            getClient: () => undefined,
            getData: () => undefined,
            getPattern: () => undefined
        })
    } as unknown as ExecutionContext;
}

test('grpc logging interceptor logs request start and complete with request id', async () => {
    const events: Array<{ message: string; pattern?: string; requestId?: string }> = [];
    const logger = {
        logRpcRequestComplete: (context: { pattern?: string; requestId?: string }) =>
            events.push({ message: 'complete', ...context }),
        logRpcRequestError: () => undefined,
        logRpcRequestStart: (context: { pattern?: string; requestId?: string }) =>
            events.push({ message: 'start', ...context })
    } as unknown as RuntimeLogger;
    const metadata = new Metadata();

    metadata.set('x-request-id', 'grpc-req-001');

    await lastValueFrom(
        new GrpcLoggingInterceptor(logger).intercept(
            createRpcExecutionContext(
                'IamGrpcController',
                'loginIdentity',
                metadata,
                {}
            ),
            {
                handle: () => of({ ok: true })
            } as CallHandler
        )
    );

    assert.deepEqual(events[0], {
        context: 'GrpcLoggingInterceptor',
        message: 'start',
        pattern: 'IamGrpcController.loginIdentity',
        requestId: 'grpc-req-001'
    });
    assert.equal(events[1]?.message, 'complete');
});

test('grpc logging interceptor logs error path', async () => {
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
                new GrpcLoggingInterceptor(logger).intercept(
                    createRpcExecutionContext(
                        'CandidateGrpcController',
                        'updateCandidateProfile',
                        new Metadata(),
                        {}
                    ),
                    {
                        handle: () => throwError(() => new Error('grpc failed'))
                    } as CallHandler
                )
            ),
        /grpc failed/
    );

    assert.equal(capturedPattern, 'CandidateGrpcController.updateCandidateProfile');
});
