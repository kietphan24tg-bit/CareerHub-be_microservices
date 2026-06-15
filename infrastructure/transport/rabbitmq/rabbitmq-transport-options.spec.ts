import assert from 'node:assert/strict';
import test from 'node:test';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import {
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
