import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  createIntegrationEvent
} from '@careerhub/contracts';
import type { GetMessage } from 'amqplib';
import { peekCommunicationDlq, replayCommunicationDlq } from './replay-communication-dlq';

const runtimeConfig = {
  brokerDeadLetterEnabled: true,
  brokerDeadLetterPrefix: 'dlq',
  brokerExchangePrefix: 'careerhub.',
  brokerQueuePrefix: ''
} as never;

function createEventMessage(messageId = 'broker-message-1'): GetMessage {
  return {
    content: Buffer.from(
      JSON.stringify(
        createIntegrationEvent(
          NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
          {
            message: 'hello',
            metadata: {},
            recipientIdentityId: 'identity-1',
            sourceEventId: 'source-1',
            title: 'title',
            type: 'application_received'
          },
          'req-1'
        )
      )
    ),
    fields: {
      deliveryTag: 1,
      exchange: 'careerhub.dlq.events',
      redelivered: false,
      routingKey: 'dlq.communication.notifications'
    },
    properties: {
      headers: {},
      messageId,
      type: NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
    }
  } as GetMessage;
}

test('peekCommunicationDlq inspects messages without ack', async () => {
  const message = createEventMessage();
  const nacked: GetMessage[] = [];
  const acked: GetMessage[] = [];

  const result = await peekCommunicationDlq(
    { count: 1, runtimeConfig },
    {
      checkQueue: async () => ({ messageCount: 1 }),
      get: async () => message,
      nack: (msg) => {
        nacked.push(msg);
      },
      ack: (msg) => {
        acked.push(msg);
      },
      publish: async () => undefined
    }
  );

  assert.equal(result.queueDepth, 1);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0]?.messageId, 'broker-message-1');
  assert.equal(nacked.length, 1);
  assert.equal(acked.length, 0);
});

test('replayCommunicationDlq dry-run does not publish or ack', async () => {
  const message = createEventMessage();
  let publishCalls = 0;
  const acked: GetMessage[] = [];

  const results = await replayCommunicationDlq(
    { dryRun: true, runtimeConfig },
    {
      get: async () => message,
      nack: () => undefined,
      ack: (msg) => {
        acked.push(msg);
      },
      publish: async () => {
        publishCalls += 1;
      },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'dry_run');
  assert.equal(publishCalls, 0);
  assert.equal(acked.length, 0);
});

test('replayCommunicationDlq acks DLQ message after publish confirm', async () => {
  const message = createEventMessage();
  const acked: GetMessage[] = [];
  let publishedRoutingKey = '';

  const results = await replayCommunicationDlq(
    { runtimeConfig },
    {
      get: async () => message,
      nack: () => undefined,
      ack: (msg) => {
        acked.push(msg);
      },
      publish: async (_exchange, routingKey) => {
        publishedRoutingKey = routingKey;
      },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'replayed');
  assert.equal(publishedRoutingKey, NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
  assert.equal(acked.length, 1);
});

test('replayCommunicationDlq keeps message in DLQ when publish fails', async () => {
  const message = createEventMessage();
  const nacked: GetMessage[] = [];
  const acked: GetMessage[] = [];

  const results = await replayCommunicationDlq(
    { runtimeConfig },
    {
      get: async () => message,
      nack: (msg) => {
        nacked.push(msg);
      },
      ack: (msg) => {
        acked.push(msg);
      },
      publish: async () => {
        throw new Error('broker unavailable');
      },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'publish_failed');
  assert.equal(nacked.length, 1);
  assert.equal(acked.length, 0);
});

test('replayCommunicationDlq finds message by messageId', async () => {
  const first = createEventMessage('first');
  const second = createEventMessage('target');
  let getCalls = 0;

  const results = await replayCommunicationDlq(
    { messageId: 'target', runtimeConfig },
    {
      get: async () => {
        getCalls += 1;
        return getCalls === 1 ? first : second;
      },
      nack: () => undefined,
      ack: () => undefined,
      publish: async () => undefined,
      checkQueue: async () => ({ messageCount: 2 })
    }
  );

  assert.equal(results[0]?.outcome, 'replayed');
  assert.equal(results[0]?.parsed?.messageId, 'target');
  assert.equal(getCalls, 2);
});

test('peekCommunicationDlq does not loop on head message when queue has one item', async () => {
  const singleMessage = createEventMessage('only-one');
  const gotten: string[] = [];
  const nacked: string[] = [];

  const result = await peekCommunicationDlq(
    { count: 3, runtimeConfig },
    {
      checkQueue: async () => ({ messageCount: 1 }),
      get: async () => {
        gotten.push(singleMessage.properties.messageId as string);
        // Simulate RabbitMQ: after first get, queue is empty (messages held unacked)
        // This is the correct behavior — messages stay unacked until nacked
        return gotten.length === 1 ? singleMessage : false;
      },
      nack: (msg) => {
        nacked.push(msg.properties.messageId as string);
      },
      ack: () => undefined,
      publish: async () => undefined
    }
  );

  assert.equal(result.messages.length, 1);
  assert.equal(gotten.length, 2); // tried to get 3, got 1 real + 1 false
  assert.equal(nacked.length, 1); // nacked only after collecting all
  assert.equal(nacked[0], 'only-one');
});

test('replayCommunicationDlq scan by messageId nacks skipped messages only after finding target', async () => {
  const messages = [
    createEventMessage('msg-1'),
    createEventMessage('msg-2'),
    createEventMessage('target'),
  ];
  let getIndex = 0;
  const nackedIds: string[] = [];
  const ackedIds: string[] = [];

  await replayCommunicationDlq(
    { messageId: 'target', runtimeConfig },
    {
      get: async () => messages[getIndex++] ?? false,
      nack: (msg) => { nackedIds.push(msg.properties.messageId as string); },
      ack: (msg) => { ackedIds.push(msg.properties.messageId as string); },
      publish: async () => undefined,
      checkQueue: async () => ({ messageCount: 3 })
    }
  );

  // target was acked (replayed), skipped messages were nacked after target found
  assert.deepEqual(nackedIds, ['msg-1', 'msg-2']);
  assert.deepEqual(ackedIds, ['target']);
});
