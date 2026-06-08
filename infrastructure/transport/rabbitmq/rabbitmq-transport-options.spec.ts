import assert from 'node:assert/strict';
import test from 'node:test';
import type { RmqOptions } from '@nestjs/microservices';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import {
    buildRabbitMqClientOptions,
    buildRabbitMqMicroserviceOptions,
    getRabbitMqDeadLetterExchangeName,
    getRabbitMqDeadLetterQueueName,
    getRabbitMqExchangeName,
    getRabbitMqQueueName
} from './rabbitmq-transport-options';

const runtimeConfig: RuntimeConfig = {
    brokerDeadLetterEnabled: true,
    brokerDeadLetterPrefix: 'dlq',
    brokerDurable: true,
    brokerExchangePrefix: 'careerhub.',
    brokerPrefetchCount: 25,
    brokerQueuePrefix: 'svc.',
    brokerUrl: 'amqp://guest:guest@localhost:5672',
    databaseUrl: undefined,
    healthEnabled: true,
    healthLivenessPath: '/health/live',
    healthPath: '/health',
    healthReadinessPath: '/health/ready',
    httpLogEnabled: true,
    logFilePath: undefined,
    logLevel: 'info',
    logPretty: false,
    metricsEnabled: true,
    metricsPath: '/metrics',
    nodeEnv: 'test',
    otelEnabled: false,
    otelExporterOtlpEndpoint: undefined,
    otelExporterOtlpProtocol: undefined,
    otelServiceName: undefined,
    otelTracesSampler: undefined,
    otelTracesSamplerArg: undefined,
    port: 3000,
    redisUrl: undefined,
    serviceName: 'test-service'
};

test('builds RabbitMQ naming helpers from runtime config prefixes', () => {
    assert.equal(getRabbitMqQueueName(runtimeConfig, 'gateway.events'), 'svc.gateway.events');
    assert.equal(getRabbitMqExchangeName(runtimeConfig, 'events'), 'careerhub.events');
    assert.equal(
        getRabbitMqDeadLetterExchangeName(runtimeConfig, 'events'),
        'careerhub.dlq.events'
    );
    assert.equal(
        getRabbitMqDeadLetterQueueName(runtimeConfig, 'gateway.events'),
        'svc.dlq.gateway.events'
    );
});

test('builds RabbitMQ microservice options with queue and dead-letter defaults', () => {
    const options = buildRabbitMqMicroserviceOptions(runtimeConfig, {
        exchange: 'events',
        queue: 'gateway.events',
        routingKey: 'gateway.cache.invalidated.v1'
    });

    assert.equal(options.options?.queue, 'svc.gateway.events');
    assert.equal(options.options?.exchange, 'careerhub.events');
    assert.equal(options.options?.prefetchCount, 25);
    assert.equal(options.options?.queueOptions?.durable, true);
    assert.equal(
        options.options?.queueOptions?.arguments?.['x-dead-letter-exchange'],
        'careerhub.dlq.events'
    );
});

test('builds RabbitMQ client options with prefixed names', () => {
    const options = buildRabbitMqClientOptions(runtimeConfig, {
        exchange: 'events',
        queue: 'gateway.events',
        routingKey: 'gateway.cache.invalidated.v1'
    }) as RmqOptions;

    assert.equal(options.options?.queue, 'svc.gateway.events');
    assert.equal(options.options?.exchange, 'careerhub.events');
    assert.equal(options.options?.routingKey, 'gateway.cache.invalidated.v1');
});
