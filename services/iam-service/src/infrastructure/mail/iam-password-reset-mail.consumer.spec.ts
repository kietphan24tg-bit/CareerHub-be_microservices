import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
} from '@careerhub/contracts';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from '../../config';
import type { PasswordResetTokenRepository } from '../../application';
import { PasswordResetTokenFactory } from '../auth/password-reset-token.factory';
import { IamPasswordResetMailConsumer } from './iam-password-reset-mail.consumer';
import { MailConfigurationError, type MailService } from './mail.service';

type TestableConsumer = {
  handleMessage(channel: ConfirmChannel, message: ConsumeMessage): Promise<void>;
};

function createConfigService(
  overrides?: Partial<Record<keyof IamEnvironmentVariables, unknown>>
): ConfigService<IamEnvironmentVariables, true> {
  const values: Partial<Record<keyof IamEnvironmentVariables, unknown>> = {
    BROKER_DEAD_LETTER_ENABLED: true,
    BROKER_DEAD_LETTER_PREFIX: 'dlq',
    BROKER_DURABLE: true,
    BROKER_EXCHANGE_PREFIX: '',
    BROKER_PREFETCH_COUNT: 10,
    BROKER_QUEUE_PREFIX: '',
    BROKER_URL: 'amqp://localhost',
    GRPC_IAM_URL: '0.0.0.0:50051',
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
    OTEL_ENABLED: false,
    OUTBOX_BACKLOG_INTERVAL_MS: 30000,
    OUTBOX_BATCH_SIZE: 20,
    OUTBOX_CLEANUP_BATCH_SIZE: 100,
    OUTBOX_CLEANUP_ENABLED: true,
    OUTBOX_CLEANUP_INTERVAL_MS: 60000,
    OUTBOX_FAILED_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
    OUTBOX_MAX_RETRY_COUNT: 5,
    OUTBOX_POLL_INTERVAL_MS: 5000,
    OUTBOX_PROCESSED_RETENTION_MS: 7 * 24 * 60 * 60 * 1000,
    OUTBOX_PUBLISH_ENABLED: true,
    OUTBOX_RETRY_DELAY_MS: 30000,
    OUTBOX_STALE_PROCESSING_TIMEOUT_MS: 60000,
    PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS: 60000,
    PASSWORD_RESET_SECRET: 'password-reset-secret',
    PASSWORD_RESET_MAIL_MAX_RETRIES: 3,
    PASSWORD_RESET_TOKEN_TTL_MS: 15 * 60 * 1000,
    PORT: 3001,
    SERVICE_NAME: 'careerhub-iam-service',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_SECRET: 'secret',
    ...overrides
  };

  return {
    get(key: keyof IamEnvironmentVariables) {
      return values[key];
    },
    getOrThrow(key: keyof IamEnvironmentVariables) {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing config: ${String(key)}`);
      }
      return value;
    }
  } as ConfigService<IamEnvironmentVariables, true>;
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

function createPasswordResetTokenRepository(
  overrides?: Partial<PasswordResetTokenRepository>
): PasswordResetTokenRepository {
  return {
    async claimMailDelivery() {
      return true;
    },
    async clearMailDeliveryClaim() {},
    async create() {},
    async findByTokenHash() {
      return null;
    },
    async invalidateActiveForIdentity() {
      return 0;
    },
    async markMailSent() {},
    async markUsed() {},
    ...overrides
  };
}

function createMessage(event: unknown): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(event)),
    properties: {
      headers: {}
    } as unknown as ConsumeMessage['properties']
  } as ConsumeMessage;
}

function createRawMessage(content: string): ConsumeMessage {
  return {
    content: Buffer.from(content),
    properties: {
      headers: {}
    } as unknown as ConsumeMessage['properties']
  } as ConsumeMessage;
}

test('acks password reset mail event only after mail is sent', async () => {
  const sentTokens: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const mailService = {
    async sendPasswordResetMail(params: { resetToken: string }) {
      sentTokens.push(params.resetToken);
    }
  } as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository(),
    metricsRegistry as never,
    createConfigService()
  ) as unknown as TestableConsumer;
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
      name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      occurredAt: '2026-06-09T12:00:00.000Z',
      payload: {
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:15:00.000Z',
        identityId: 'identity-1',
        occurredAt: '2026-06-09T12:00:00.000Z',
        resetTokenId: 'reset-token-1'
      },
      requestId: 'req-1',
      version: 1
    })
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(sentTokens.length, 1);
  assert.match(sentTokens[0] ?? '', /^reset-token-1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(metricsRegistry.integrationConsumerRecords, [
    {
      consumer: 'iam-password-reset-mail',
      eventName: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      reason: 'mail_sent',
      service: 'careerhub-iam-service',
      status: 'processed'
    }
  ]);
  assert.equal(metricsRegistry.integrationConsumerDurationRecords.length, 1);
});

test('republishes password reset mail event for retry when mail send fails', async () => {
  const repositoryCalls: string[] = [];
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('smtp unavailable');
    }
  } as unknown as MailService;
  const consumerInstance = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository({
      async clearMailDeliveryClaim() {
        repositoryCalls.push('clearMailDeliveryClaim');
      }
    }),
    createMetricsRegistry() as never,
    createConfigService()
  );
  // Set retryTopology directly since startConsumer is not called in unit tests
  (consumerInstance as unknown as Record<string, unknown>)['retryTopology'] = {
    mainExchange: 'events',
    retryQueues: ['iam.password-reset-mail.retry.30s']
  };
  const consumer = consumerInstance as unknown as TestableConsumer;
  const channelCalls: string[] = [];
  const publishedHeaders: Array<Record<string, unknown> | undefined> = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack(_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
      channelCalls.push(`nack:${requeue}`);
    },
    publish(
      _exchange: string,
      _routingKey: string,
      _content: Buffer,
      options?: { headers?: Record<string, unknown> }
    ) {
      publishedHeaders.push(options?.headers);
      return true;
    },
    async waitForConfirms() {
      channelCalls.push('waitForConfirms');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage({
      name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      occurredAt: '2026-06-09T12:00:00.000Z',
      payload: {
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:15:00.000Z',
        identityId: 'identity-1',
        occurredAt: '2026-06-09T12:00:00.000Z',
        resetTokenId: 'reset-token-1'
      },
      requestId: 'req-1',
      version: 1
    })
  );

  assert.deepEqual(channelCalls, ['waitForConfirms', 'ack']);
  assert.equal(publishedHeaders.length, 1);
  assert.equal(publishedHeaders[0]?.['x-careerhub-retry-count'], 1);
  assert.deepEqual(repositoryCalls, ['clearMailDeliveryClaim']);
});

test('nacks password reset mail event to DLQ when retry count is exhausted', async () => {
  const repositoryCalls: string[] = [];
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('smtp unavailable');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository({
      async clearMailDeliveryClaim() {
        repositoryCalls.push('clearMailDeliveryClaim');
      }
    }),
    createMetricsRegistry() as never,
    createConfigService({
      PASSWORD_RESET_MAIL_MAX_RETRIES: 2
    })
  ) as unknown as TestableConsumer;
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack(_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
      channelCalls.push(`nack:${requeue}`);
    }
  } as unknown as ConfirmChannel;
  const message = createMessage({
    name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
    occurredAt: '2026-06-09T12:00:00.000Z',
    payload: {
      email: 'user@example.com',
      expiresAt: '2026-06-09T12:15:00.000Z',
      identityId: 'identity-1',
      occurredAt: '2026-06-09T12:00:00.000Z',
      resetTokenId: 'reset-token-1'
    },
    requestId: 'req-1',
    version: 1
  });
  message.properties = {
    headers: {
      'x-careerhub-retry-count': 2
    }
  } as unknown as ConsumeMessage['properties'];

  await consumer.handleMessage(channel, message);

  assert.deepEqual(channelCalls, ['nack:false']);
  assert.deepEqual(repositoryCalls, ['clearMailDeliveryClaim']);
});

test('acks malformed password reset mail event without retrying', async () => {
  const metricsRegistry = createMetricsRegistry();
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('should not send mail');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository(),
    metricsRegistry as never,
    createConfigService()
  ) as unknown as TestableConsumer;
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(channel, createRawMessage('{'));

  assert.deepEqual(channelCalls, ['ack']);
  assert.deepEqual(metricsRegistry.integrationConsumerRecords, [
    {
      consumer: 'iam-password-reset-mail',
      eventName: 'unknown',
      reason: 'malformed_payload',
      service: 'careerhub-iam-service',
      status: 'error'
    }
  ]);
  assert.equal(metricsRegistry.integrationConsumerDurationRecords.length, 1);
});

test('acks unsupported password reset mail event payload without retrying', async () => {
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('should not send mail');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository(),
    createMetricsRegistry() as never,
    createConfigService()
  ) as unknown as TestableConsumer;
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
      name: 'iam.unsupported.v1',
      payload: {}
    })
  );

  assert.deepEqual(channelCalls, ['ack']);
});

test('nacks password reset mail event to DLQ when mail config is missing', async () => {
  const mailService = {
    async sendPasswordResetMail() {
      throw new MailConfigurationError('Mail transport is not configured');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository(),
    createMetricsRegistry() as never,
    createConfigService()
  ) as unknown as TestableConsumer;
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
      name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      occurredAt: '2026-06-09T12:00:00.000Z',
      payload: {
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:15:00.000Z',
        identityId: 'identity-1',
        occurredAt: '2026-06-09T12:00:00.000Z',
        resetTokenId: 'reset-token-1'
      },
      requestId: 'req-1',
      version: 1
    })
  );

  assert.deepEqual(channelCalls, ['nack']);
});

test('acks duplicate password reset mail event without sending mail again', async () => {
  const sentTokens: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const mailService = {
    async sendPasswordResetMail(params: { resetToken: string }) {
      sentTokens.push(params.resetToken);
    }
  } as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createPasswordResetTokenRepository({
      async claimMailDelivery() {
        return false;
      }
    }),
    metricsRegistry as never,
    createConfigService()
  ) as unknown as TestableConsumer;
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
      name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      occurredAt: '2026-06-09T12:00:00.000Z',
      payload: {
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:15:00.000Z',
        identityId: 'identity-1',
        occurredAt: '2026-06-09T12:00:00.000Z',
        resetTokenId: 'reset-token-1'
      },
      requestId: 'req-1',
      version: 1
    })
  );

  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(sentTokens.length, 0);
  assert.deepEqual(metricsRegistry.integrationConsumerRecords, [
    {
      consumer: 'iam-password-reset-mail',
      eventName: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      reason: 'duplicate_or_in_flight',
      service: 'careerhub-iam-service',
      status: 'duplicate'
    }
  ]);
  assert.equal(metricsRegistry.integrationConsumerDurationRecords.length, 1);
});
