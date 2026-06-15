import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConfirmChannel } from 'amqplib';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import {
  assertRabbitMqParkingDeadLetterTopology,
  getRabbitMqParkingDeadLetterTopology
} from './rabbitmq-dead-letter-topology';

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

test('getRabbitMqParkingDeadLetterTopology resolves parking DLQ names', () => {
  const topology = getRabbitMqParkingDeadLetterTopology(
    runtimeConfig,
    'events',
    'communication.notifications'
  );

  assert.equal(topology.exchange, 'careerhub.events');
  assert.equal(topology.queue, 'svc.communication.notifications');
  assert.equal(topology.deadLetterExchange, 'careerhub.dlq.events');
  assert.equal(topology.deadLetterQueue, 'svc.dlq.communication.notifications');
  assert.equal(topology.deadLetterRoutingKey, 'svc.dlq.communication.notifications');
});

test('assertRabbitMqParkingDeadLetterTopology declares DLX when enabled', async () => {
  const calls: Array<{ args: unknown[]; method: string }> = [];
  const channel = {
    assertExchange(...args: unknown[]) {
      calls.push({ args, method: 'assertExchange' });
      return Promise.resolve({});
    },
    assertQueue(...args: unknown[]) {
      calls.push({ args, method: 'assertQueue' });
      return Promise.resolve({});
    },
    bindQueue(...args: unknown[]) {
      calls.push({ args, method: 'bindQueue' });
      return Promise.resolve({});
    }
  } as unknown as ConfirmChannel;

  const topology = await assertRabbitMqParkingDeadLetterTopology(
    channel,
    runtimeConfig,
    'events',
    'communication.notifications'
  );

  assert.equal(topology.queue, 'svc.communication.notifications');
  assert.deepEqual(calls, [
    {
      args: ['careerhub.events', 'topic', { durable: true }],
      method: 'assertExchange'
    },
    {
      args: ['careerhub.dlq.events', 'topic', { durable: true }],
      method: 'assertExchange'
    },
    {
      args: ['svc.dlq.communication.notifications', { durable: true }],
      method: 'assertQueue'
    },
    {
      args: [
        'svc.dlq.communication.notifications',
        'careerhub.dlq.events',
        'svc.dlq.communication.notifications'
      ],
      method: 'bindQueue'
    },
    {
      args: [
        'svc.communication.notifications',
        {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'careerhub.dlq.events',
            'x-dead-letter-routing-key': 'svc.dlq.communication.notifications'
          }
        }
      ],
      method: 'assertQueue'
    }
  ]);
});

test('assertRabbitMqParkingDeadLetterTopology skips DLX when disabled', async () => {
  const calls: Array<{ args: unknown[]; method: string }> = [];
  const channel = {
    assertExchange(...args: unknown[]) {
      calls.push({ args, method: 'assertExchange' });
      return Promise.resolve({});
    },
    assertQueue(...args: unknown[]) {
      calls.push({ args, method: 'assertQueue' });
      return Promise.resolve({});
    },
    bindQueue(...args: unknown[]) {
      calls.push({ args, method: 'bindQueue' });
      return Promise.resolve({});
    }
  } as unknown as ConfirmChannel;

  await assertRabbitMqParkingDeadLetterTopology(
    channel,
    {
      ...runtimeConfig,
      brokerDeadLetterEnabled: false
    },
    'events',
    'communication.notifications'
  );

  assert.deepEqual(calls, [
    {
      args: ['careerhub.events', 'topic', { durable: true }],
      method: 'assertExchange'
    },
    {
      args: ['svc.communication.notifications', { durable: true }],
      method: 'assertQueue'
    }
  ]);
});
