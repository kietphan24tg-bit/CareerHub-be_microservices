import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createIntegrationEvent,
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
} from '@careerhub/contracts';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { ConfigService } from '@nestjs/config';
import type { CommunicationEnvironmentVariables } from '../../config';
import type { NotificationOperationsService } from '../../application';
import { CommunicationNotificationConsumer, buildNotificationConsumerTopologyMessages } from './communication-notification.consumer';

type TestableConsumer = {
  handleMessage(channel: ConfirmChannel, message: ConsumeMessage): Promise<void>;
};

function createConfigService(
  overrides: Partial<Record<keyof CommunicationEnvironmentVariables, unknown>> = {}
): ConfigService<CommunicationEnvironmentVariables, true> {
  const values: Partial<Record<keyof CommunicationEnvironmentVariables, unknown>> = {
    BROKER_DEAD_LETTER_ENABLED: true,
    BROKER_DEAD_LETTER_PREFIX: 'dlq',
    BROKER_DURABLE: true,
    BROKER_EXCHANGE_PREFIX: '',
    BROKER_PREFETCH_COUNT: 10,
    BROKER_QUEUE_PREFIX: '',
    BROKER_URL: 'amqp://localhost',
    GRPC_COMMUNICATION_URL: '0.0.0.0:50056',
    GRPC_IAM_URL: '0.0.0.0:50051',
    MAIL_DELIVERY_CLAIM_TIMEOUT_MS: 60_000,
    MAIL_INTERVIEW_MAX_RETRIES: 3,
    MAIL_OFFER_MAX_RETRIES: 3,
    HEALTH_ENABLED: true,
    HEALTH_LIVENESS_PATH: '/health/live',
    HEALTH_PATH: '/health',
    HEALTH_READINESS_PATH: '/health/ready',
    HTTP_LOG_ENABLED: true,
    LOG_LEVEL: 'debug',
    LOG_PRETTY: true,
    METRICS_ENABLED: true,
    METRICS_PATH: '/metrics',
    NODE_ENV: 'test',
    NOTIFICATION_MAX_RETRIES: 3,
    OTEL_ENABLED: false,
    PORT: 3010,
    SERVICE_NAME: 'careerhub-communication-service',
    ...overrides
  };

  return {
    get(key: keyof CommunicationEnvironmentVariables) {
      return values[key];
    },
    getOrThrow(key: keyof CommunicationEnvironmentVariables) {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing config: ${String(key)}`);
      }
      return value;
    }
  } as ConfigService<CommunicationEnvironmentVariables, true>;
}

function createMetricsRegistry() {
  const integrationConsumerDurationRecords: Array<Record<string, unknown>> = [];
  const integrationConsumerRecords: Array<Record<string, unknown>> = [];

  return {
    integrationConsumerDurationRecords,
    integrationConsumerRecords,
    recordHttpError() {},
    recordHttpRequest() {},
    recordIntegrationConsumer(record: Record<string, unknown>) {
      integrationConsumerRecords.push(record);
    },
    recordIntegrationConsumerDuration(record: Record<string, unknown>) {
      integrationConsumerDurationRecords.push(record);
    },
    recordOutboxBacklog() {},
    recordOutboxCleanup() {},
    recordOutboxPublish() {},
    recordRmqError() {},
    recordRmqRequest() {},
    recordRpcError() {},
    recordRpcRequest() {},
    renderPrometheus() {
      return '';
    }
  };
}

function createMessage(event: unknown): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(event)),
    properties: {
      headers: {},
      messageId: 'broker-message-1'
    } as unknown as ConsumeMessage['properties']
  } as ConsumeMessage;
}

function createConsumer(
  notificationOperationsService: NotificationOperationsService,
  options?: {
    configOverrides?: Partial<Record<keyof CommunicationEnvironmentVariables, unknown>>;
  }
) {
  const metricsRegistry = createMetricsRegistry();

  return {
    consumer: new CommunicationNotificationConsumer(
      notificationOperationsService,
      metricsRegistry as never,
      createConfigService(options?.configOverrides)
    ) as unknown as TestableConsumer,
    metricsRegistry
  };
}

test('acks valid notification event after createNotificationIfNew succeeds', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const { consumer } = createConsumer({
    async createNotificationIfNew(input: {
      identityId: string;
      message: string;
      metadataJson?: string;
      sourceEventId?: string;
      title: string;
      type: string;
    }) {
      calls.push(input);
      return {
        created: true,
        notification: {
          createdAt: new Date('2026-06-12T00:00:00.000Z'),
          id: 'notification-1',
          identityId: input.identityId,
          message: input.message,
          metadataJson: input.metadataJson ?? null,
          readAt: null,
          sourceEventId: input.sourceEventId ?? null,
          title: input.title,
          type: input.type
        }
      };
    }
  } as never);
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage(
      createIntegrationEvent(
        NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
        {
          message: 'A candidate applied to your job posting.',
          metadata: { applicationId: 'application-1' },
          recipientIdentityId: 'employer-1',
          sourceEventId: 'event-1',
          title: 'New application received',
          type: 'application_received'
        },
        'req-1'
      )
    )
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.identityId, 'employer-1');
  assert.equal(calls[0]?.sourceEventId, 'event-1');
});

test('acks duplicate notification event without creating a new record', async () => {
  const { consumer, metricsRegistry } = createConsumer({
    async createNotificationIfNew() {
      return {
        created: false,
        notification: {
          createdAt: new Date('2026-06-12T00:00:00.000Z'),
          id: 'notification-1',
          identityId: 'employer-1',
          message: 'A candidate applied to your job posting.',
          metadataJson: null,
          readAt: null,
          sourceEventId: 'event-1',
          title: 'New application received',
          type: 'application_received'
        }
      };
    }
  } as never);
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage(
      createIntegrationEvent(
        NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
        {
          message: 'A candidate applied to your job posting.',
          metadata: { applicationId: 'application-1' },
          recipientIdentityId: 'employer-1',
          sourceEventId: 'event-1',
          title: 'New application received',
          type: 'application_received'
        },
        'req-1'
      )
    )
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.status, 'duplicate');
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.reason, 'duplicate');
});

test('acks malformed notification payload without touching the database', async () => {
  let createCalls = 0;
  const { consumer, metricsRegistry } = createConsumer({
    async createNotificationIfNew() {
      createCalls += 1;
      throw new Error('should not be called');
    }
  } as never);
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    {
      content: Buffer.from('{invalid-json'),
      properties: {
        headers: {},
        messageId: 'broker-message-2'
      } as unknown as ConsumeMessage['properties']
    } as ConsumeMessage
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(createCalls, 0);
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.reason, 'malformed_payload');
});

test('acks unsupported notification payload without retry', async () => {
  let createCalls = 0;
  const { consumer, metricsRegistry } = createConsumer({
    async createNotificationIfNew() {
      createCalls += 1;
      throw new Error('should not be called');
    }
  } as never);
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage({
      name: 'notifications.unknown.v1',
      payload: {
        message: 'unsupported',
        metadata: {},
        recipientIdentityId: 'identity-1',
        sourceEventId: 'event-unsupported',
        title: 'Unsupported',
        type: 'unknown'
      }
    })
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(createCalls, 0);
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.reason, 'unsupported_payload');
});

test('dead-letters notification event when processing fails and DLX is enabled', async () => {
  const { consumer, metricsRegistry } = createConsumer(
    {
      async createNotificationIfNew() {
        throw new Error('database unavailable');
      }
    } as never,
    { configOverrides: { NOTIFICATION_MAX_RETRIES: 0 } }
  );
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack(_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
      channelCalls.push(requeue ? 'nack-requeue' : 'nack-dead-letter');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage(
      createIntegrationEvent(
        NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
        {
          message: 'A candidate applied to your job posting.',
          metadata: { applicationId: 'application-1' },
          recipientIdentityId: 'employer-1',
          sourceEventId: 'event-1',
          title: 'New application received',
          type: 'application_received'
        },
        'req-1'
      )
    )
  );

  assert.deepEqual(channelCalls, ['nack-dead-letter']);
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.reason, 'dead_lettered');
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.status, 'dead_lettered');
});

test('requeues notification event when processing fails and DLX is disabled', async () => {
  const { consumer, metricsRegistry } = createConsumer(
    {
      async createNotificationIfNew() {
        throw new Error('database unavailable');
      }
    } as never,
    {
      configOverrides: {
        BROKER_DEAD_LETTER_ENABLED: false,
        NOTIFICATION_MAX_RETRIES: 0
      }
    }
  );
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack(_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
      channelCalls.push(requeue ? 'nack-requeue' : 'nack-dead-letter');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage(
      createIntegrationEvent(
        NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
        {
          message: 'A candidate applied to your job posting.',
          metadata: { applicationId: 'application-1' },
          recipientIdentityId: 'employer-1',
          sourceEventId: 'event-1',
          title: 'New application received',
          type: 'application_received'
        },
        'req-1'
      )
    )
  );

  assert.deepEqual(channelCalls, ['nack-requeue']);
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.reason, 'processing_failed');
  assert.equal(metricsRegistry.integrationConsumerRecords[0]?.status, 'error');
});

test('buildNotificationConsumerTopologyMessages logs DLQ topology when enabled', () => {
  const messages = buildNotificationConsumerTopologyMessages({
    deadLetterEnabled: true,
    routingPattern: 'notifications.#',
    topology: {
      deadLetterExchange: 'careerhub.dlq.events',
      deadLetterQueue: 'dlq.communication.notifications',
      deadLetterRoutingKey: 'dlq.communication.notifications',
      exchange: 'careerhub.events',
      queue: 'communication.notifications'
    }
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.level, 'log');
  assert.match(messages[0]?.message ?? '', /exchange=careerhub\.events/);
  assert.match(messages[0]?.message ?? '', /queue=communication\.notifications/);
  assert.match(messages[1]?.message ?? '', /parking DLQ enabled/);
  assert.match(messages[1]?.message ?? '', /dlq=dlq\.communication\.notifications/);
});

test('buildNotificationConsumerTopologyMessages warns when DLQ is disabled', () => {
  const messages = buildNotificationConsumerTopologyMessages({
    deadLetterEnabled: false,
    routingPattern: 'notifications.#',
    topology: {
      deadLetterExchange: 'careerhub.dlq.events',
      deadLetterQueue: 'dlq.communication.notifications',
      deadLetterRoutingKey: 'dlq.communication.notifications',
      exchange: 'careerhub.events',
      queue: 'communication.notifications'
    }
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[1]?.level, 'warn');
  assert.match(messages[1]?.message ?? '', /NOT recommended for production/);
});
