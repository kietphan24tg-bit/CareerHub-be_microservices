import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeLogger } from '../../observability/logging/runtime-logger';
import { InMemoryMetricsRegistry } from '../../observability/metrics/in-memory-metrics.registry';
import { GrpcLoggingInterceptor } from '../../observability/interceptors/grpc/grpc-logging.interceptor';
import { GrpcMetricsInterceptor } from '../../observability/interceptors/grpc/grpc-metrics.interceptor';
import { GrpcTracingInterceptor } from '../../observability/interceptors/grpc/grpc-tracing.interceptor';
import { configureGrpcRuntime } from './configure-grpc-runtime';

test('configureGrpcRuntime attaches tracing, logging, and metrics interceptors', () => {
    const captured: unknown[] = [];
    const target = {
        useGlobalInterceptors(...interceptors: unknown[]) {
            captured.push(...interceptors);
            return this;
        }
    };

    configureGrpcRuntime(target, {
        logger: new RuntimeLogger({
            level: 'info',
            pretty: false,
            serviceName: 'test-service'
        }),
        metricsRegistry: new InMemoryMetricsRegistry()
    });

    assert.equal(captured.length, 3);
    assert.ok(captured[0] instanceof GrpcTracingInterceptor);
    assert.ok(captured[1] instanceof GrpcLoggingInterceptor);
    assert.ok(captured[2] instanceof GrpcMetricsInterceptor);
});
