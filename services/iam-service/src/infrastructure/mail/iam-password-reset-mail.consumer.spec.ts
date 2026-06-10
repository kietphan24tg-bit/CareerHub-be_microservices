import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
} from '@careerhub/contracts';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from '../../config';
import { PasswordResetTokenFactory } from '../auth/password-reset-token.factory';
import { IamPasswordResetMailConsumer } from './iam-password-reset-mail.consumer';
import { MailConfigurationError, type MailService } from './mail.service';

type TestableConsumer = {
  handleMessage(channel: ConfirmChannel, message: ConsumeMessage): Promise<void>;
};

function createConfigService(): ConfigService<IamEnvironmentVariables, true> {
  const values: Partial<Record<keyof IamEnvironmentVariables, unknown>> = {
    BROKER_DEAD_LETTER_ENABLED: true,
    BROKER_DEAD_LETTER_PREFIX: 'dlq',
    BROKER_DURABLE: true,
    BROKER_EXCHANGE_PREFIX: '',
    BROKER_PREFETCH_COUNT: 10,
    BROKER_QUEUE_PREFIX: '',
    BROKER_URL: 'amqp://localhost',
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
    PORT: 3001,
    SERVICE_NAME: 'careerhub-iam-service'
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

function createMessage(event: unknown): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(event))
  } as ConsumeMessage;
}

function createRawMessage(content: string): ConsumeMessage {
  return {
    content: Buffer.from(content)
  } as ConsumeMessage;
}

test('acks password reset mail event only after mail is sent', async () => {
  const sentTokens: string[] = [];
  const mailService = {
    async sendPasswordResetMail(params: { resetToken: string }) {
      sentTokens.push(params.resetToken);
    }
  } as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
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
});

test('nacks password reset mail event when mail send fails', async () => {
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('smtp unavailable');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
    createConfigService()
  ) as unknown as TestableConsumer;
  const nackCalls: Array<{ requeue: boolean }> = [];
  const channel = {
    ack() {
      throw new Error('should not ack');
    },
    nack(_message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
      nackCalls.push({ requeue });
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

  assert.deepEqual(nackCalls, [{ requeue: true }]);
});

test('acks malformed password reset mail event without retrying', async () => {
  const mailService = {
    async sendPasswordResetMail() {
      throw new Error('should not send mail');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
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

test('acks password reset mail event when mail config is missing', async () => {
  const mailService = {
    async sendPasswordResetMail() {
      throw new MailConfigurationError('Mail transport is not configured');
    }
  } as unknown as MailService;
  const consumer = new IamPasswordResetMailConsumer(
    mailService,
    new PasswordResetTokenFactory('secret'),
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
});
