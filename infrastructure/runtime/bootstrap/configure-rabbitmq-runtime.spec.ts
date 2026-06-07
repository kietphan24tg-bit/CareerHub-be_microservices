import assert from 'node:assert/strict';
import test from 'node:test';
import type { INestMicroservice } from '@nestjs/common';
import { RuntimeLogger } from '../../observability/logging/runtime-logger';
import { InMemoryMetricsRegistry } from '../../observability/metrics/in-memory-metrics.registry';
import { RabbitMqLoggingInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-logging.interceptor';
import { RabbitMqMetricsInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-metrics.interceptor';
import { RabbitMqTracingInterceptor } from '../../observability/interceptors/rabbitmq/rabbitmq-tracing.interceptor';
import { configureRabbitMqRuntime } from './configure-rabbitmq-runtime';

test('configureRabbitMqRuntime attaches tracing, logging, and metrics interceptors', () => {
    const captured: unknown[] = [];
    const microservice = {
        useGlobalInterceptors(...interceptors: unknown[]) {
            captured.push(...interceptors);
        }
    } as unknown as INestMicroservice;

    configureRabbitMqRuntime(
        microservice,
        {
            logger: new RuntimeLogger({
                level: 'info',
                pretty: false,
                serviceName: 'test-service'
            }),
            metricsRegistry: new InMemoryMetricsRegistry()
        },
        {
            queue: 'gateway.events',
            serviceName: 'gateway'
        }
    );

    assert.equal(captured.length, 3);
    assert.ok(captured[0] instanceof RabbitMqTracingInterceptor);
    assert.ok(captured[1] instanceof RabbitMqLoggingInterceptor);
    assert.ok(captured[2] instanceof RabbitMqMetricsInterceptor);
});
