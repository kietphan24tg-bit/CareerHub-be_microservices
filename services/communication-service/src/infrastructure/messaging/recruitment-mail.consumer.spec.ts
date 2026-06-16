import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createIntegrationEvent,
  MAIL_INTERVIEW_CREATED_EVENT_NAME,
  MAIL_OFFER_SENT_EVENT_NAME
} from '@careerhub/contracts';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { ConfigService } from '@nestjs/config';
import type { CommunicationEnvironmentVariables } from '../../config';
import type { RecruitmentMailDeliveryRepository } from '../../application';
import { RecruitmentMailConsumer } from './recruitment-mail.consumer';

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
    HEALTH_ENABLED: true,
    HEALTH_LIVENESS_PATH: '/health/live',
    HEALTH_PATH: '/health',
    HEALTH_READINESS_PATH: '/health/ready',
    HTTP_LOG_ENABLED: true,
    LOG_LEVEL: 'debug',
    LOG_PRETTY: true,
    MAIL_DELIVERY_CLAIM_TIMEOUT_MS: 60_000,
    MAIL_INTERVIEW_MAX_RETRIES: 3,
    MAIL_OFFER_MAX_RETRIES: 3,
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
  const integrationConsumerRecords: Array<Record<string, unknown>> = [];

  return {
    integrationConsumerRecords,
    recordHttpError() {},
    recordHttpRequest() {},
    recordIntegrationConsumer(record: Record<string, unknown>) {
      integrationConsumerRecords.push(record);
    },
    recordIntegrationConsumerDuration() {},
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

function createInterviewMailEvent() {
  return createIntegrationEvent(
    MAIL_INTERVIEW_CREATED_EVENT_NAME,
    {
      appUrl: 'http://localhost:4000/candidate/interviews/interview-1',
      companyName: 'Acme Corp',
      date: '2026-06-20',
      endTime: '11:00',
      interviewId: 'interview-1',
      jobTitle: 'Software Engineer',
      meetingLink: null,
      platform: 'Google Meet',
      preview: 'A new interview invitation is available in your CareerHub account.',
      recipientIdentityId: 'candidate-1',
      sourceEventId: 'mail-source-1',
      startTime: '10:00',
      subject: 'CareerHub interview invitation',
      timezone: 'Asia/Ho_Chi_Minh',
      type: 'online'
    },
    'req-1'
  );
}

function createOfferMailEvent() {
  return createIntegrationEvent(
    MAIL_OFFER_SENT_EVENT_NAME,
    {
      appUrl: 'http://localhost:4000/candidate/offers/offer-1',
      benefits: [
        {
          amount: null,
          annualLeaveDays: 12,
          currency: null,
          description: null,
          frequency: null,
          hasMonetaryValue: false,
          name: null,
          type: 'annual_leave'
        }
      ],
      bonusDetails: null,
      companyName: 'Acme Corp',
      contractDocumentUrl: null,
      currency: 'USD',
      departmentTeam: null,
      employmentType: 'full_time',
      expiresAt: '2026-12-31T00:00:00.000Z',
      location: null,
      message: null,
      offerId: 'offer-1',
      preview: 'A new job offer is available in your CareerHub account.',
      probationCustom: null,
      probationType: null,
      recipientIdentityId: 'candidate-1',
      reportingTo: null,
      salary: '5000',
      salaryPeriod: 'monthly',
      seniorityLabel: null,
      sourceEventId: 'mail-source-2',
      startDate: '2026-07-01',
      subject: 'CareerHub job offer received',
      title: 'Senior Engineer',
      workModel: 'hybrid'
    },
    'req-2'
  );
}

function createMessage(
  event: { name?: string } | unknown,
  options?: {
    headers?: Record<string, unknown>;
    messageId?: string;
    type?: string;
  }
): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(event)),
    properties: {
      headers: options?.headers ?? {},
      messageId: options?.messageId ?? 'broker-message-1',
      type: options?.type ?? (typeof (event as { name?: unknown }).name === 'string' ? (event as { name: string }).name : undefined)
    } as unknown as ConsumeMessage['properties']
  } as ConsumeMessage;
}

function createInMemoryDeliveryRepository(): RecruitmentMailDeliveryRepository & {
  claimCalls: number;
  markSentCalls: string[];
  statuses: Map<string, string>;
} {
  const statuses = new Map<string, string>();
  let claimCalls = 0;
  const markSentCalls: string[] = [];

  return {
    get claimCalls() {
      return claimCalls;
    },
    markSentCalls,
    statuses,
    async claimDelivery(input) {
      claimCalls += 1;
      if (statuses.get(input.sourceEventId) === 'sent') {
        return 'duplicate_sent';
      }
      if (statuses.get(input.sourceEventId) === 'claimed') {
        return 'duplicate_in_flight';
      }
      statuses.set(input.sourceEventId, 'claimed');
      return 'claimed';
    },
    async clearClaim(sourceEventId) {
      if (statuses.get(sourceEventId) === 'claimed') {
        statuses.set(sourceEventId, 'failed');
      }
    },
    async markFailed(sourceEventId) {
      statuses.set(sourceEventId, 'failed');
    },
    async markSent(sourceEventId) {
      markSentCalls.push(sourceEventId);
      statuses.set(sourceEventId, 'sent');
    }
  };
}

function createConsumer(input: {
  deliveryRepository?: ReturnType<typeof createInMemoryDeliveryRepository>;
  iamEmail?: string | null;
  mailError?: Error;
  configOverrides?: Partial<Record<keyof CommunicationEnvironmentVariables, unknown>>;
}) {
  const deliveryRepository = input.deliveryRepository ?? createInMemoryDeliveryRepository();
  const metricsRegistry = createMetricsRegistry();
  const sentMails: string[] = [];
  const offerMails: string[] = [];

  const consumerInstance = new RecruitmentMailConsumer(
    {
      async sendInterviewMail(params: { email: string }) {
        if (input.mailError) {
          throw input.mailError;
        }
        sentMails.push(params.email);
      },
      async sendOfferMail(params: { email: string }) {
        if (input.mailError) {
          throw input.mailError;
        }
        offerMails.push(params.email);
      }
    } as never,
    deliveryRepository,
    {
      async findEmailByIdentityId() {
        return input.iamEmail === undefined ? 'candidate@example.com' : input.iamEmail;
      }
    },
    {
      generate() {
        return 'delivery-id-1';
      }
    },
    metricsRegistry as never,
    createConfigService(input.configOverrides)
  );

  const consumer = consumerInstance as unknown as TestableConsumer;

  return {
    consumer,
    deliveryRepository,
    metricsRegistry,
    sentMails,
    offerMails
  };
}

test('recruitment mail consumer claims delivery before SMTP and marks sent after success', async () => {
  const { consumer, deliveryRepository, metricsRegistry, sentMails } = createConsumer({});
  let ackCalls = 0;
  const channel = {
    ack() {
      ackCalls += 1;
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(channel, createMessage(createInterviewMailEvent()));

  assert.equal(deliveryRepository.claimCalls, 1);
  assert.deepEqual(deliveryRepository.markSentCalls, ['mail-source-1']);
  assert.equal(deliveryRepository.statuses.get('mail-source-1'), 'sent');
  assert.deepEqual(sentMails, ['candidate@example.com']);
  assert.equal(ackCalls, 1);
  assert.equal(metricsRegistry.integrationConsumerRecords.at(-1)?.reason, 'mail_sent');
});

test('recruitment mail consumer acks duplicate when delivery already sent', async () => {
  const deliveryRepository = createInMemoryDeliveryRepository();
  deliveryRepository.statuses.set('mail-source-1', 'sent');
  const { consumer, sentMails } = createConsumer({ deliveryRepository });
  let ackCalls = 0;
  const channel = {
    ack() {
      ackCalls += 1;
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(channel, createMessage(createInterviewMailEvent()));

  assert.equal(sentMails.length, 0);
  assert.equal(ackCalls, 1);
});

test('recruitment mail consumer acks unsupported payload without claim', async () => {
  const deliveryRepository = createInMemoryDeliveryRepository();
  const { consumer } = createConsumer({ deliveryRepository });
  let ackCalls = 0;
  const channel = {
    ack() {
      ackCalls += 1;
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage({ name: 'notifications.offer-sent.v1', payload: {} })
  );

  assert.equal(deliveryRepository.claimCalls, 0);
  assert.equal(ackCalls, 1);
});

test('recruitment mail consumer acks malformed payload without claim', async () => {
  const deliveryRepository = createInMemoryDeliveryRepository();
  const { consumer, metricsRegistry } = createConsumer({ deliveryRepository });
  const channelCalls: string[] = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
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
  assert.equal(deliveryRepository.claimCalls, 0);
  assert.equal(metricsRegistry.integrationConsumerRecords.at(-1)?.reason, 'malformed_payload');
});

test('recruitment mail consumer delivers offer mail and marks sent', async () => {
  const { consumer, deliveryRepository, offerMails } = createConsumer({});
  let ackCalls = 0;
  const channel = {
    ack() {
      ackCalls += 1;
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(channel, createMessage(createOfferMailEvent()));

  assert.equal(deliveryRepository.claimCalls, 1);
  assert.deepEqual(deliveryRepository.markSentCalls, ['mail-source-2']);
  assert.deepEqual(offerMails, ['candidate@example.com']);
  assert.equal(ackCalls, 1);
});

test('recruitment mail consumer schedules retry when processing fails and retries remain', async () => {
  const { consumer, deliveryRepository, metricsRegistry } = createConsumer({
    mailError: new Error('smtp down'),
    configOverrides: {
      MAIL_INTERVIEW_MAX_RETRIES: 0,
      MAIL_OFFER_MAX_RETRIES: 1
    }
  });
  const channelCalls: string[] = [];
  const publishCalls: Array<{ exchange: string; routingKey: string; headers: unknown }> = [];
  const channel = {
    ack() {
      channelCalls.push('ack');
    },
    nack() {
      channelCalls.push('nack');
    },
    publish(exchange: string, routingKey: string, _content: Buffer, options: { headers?: unknown }) {
      publishCalls.push({ exchange, routingKey, headers: options.headers });
      return true;
    },
    async waitForConfirms() {
      return undefined;
    }
  } as unknown as ConfirmChannel;

  await consumer.handleMessage(
    channel,
    createMessage(createOfferMailEvent(), {
      headers: { 'x-careerhub-retry-count': 0 },
      messageId: 'broker-message-3',
      type: MAIL_OFFER_SENT_EVENT_NAME
    })
  );

  assert.equal(deliveryRepository.statuses.get('mail-source-2'), 'failed');
  assert.deepEqual(channelCalls, ['ack']);
  assert.equal(publishCalls.length, 1);
  assert.equal(publishCalls[0]?.routingKey, MAIL_OFFER_SENT_EVENT_NAME);
  assert.equal(metricsRegistry.integrationConsumerRecords.at(-1)?.reason, 'retry_scheduled');
});

test('recruitment mail consumer dead-letters after retries exhausted when DLX enabled', async () => {
  const { consumer, deliveryRepository, metricsRegistry } = createConsumer({
    iamEmail: null,
    configOverrides: {
      MAIL_INTERVIEW_MAX_RETRIES: 0,
      MAIL_OFFER_MAX_RETRIES: 0
    }
  });
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
    createMessage(createInterviewMailEvent(), {
      headers: { 'x-careerhub-retry-count': 0 },
      messageId: 'broker-message-4',
      type: MAIL_INTERVIEW_CREATED_EVENT_NAME
    })
  );

  assert.equal(deliveryRepository.statuses.get('mail-source-1'), 'failed');
  assert.ok(metricsRegistry.integrationConsumerRecords.some((r) => r.reason === 'recipient_not_found'));
  assert.equal(metricsRegistry.integrationConsumerRecords.at(-1)?.reason, 'dead_lettered');
  assert.deepEqual(channelCalls, ['nack-dead-letter']);
});
