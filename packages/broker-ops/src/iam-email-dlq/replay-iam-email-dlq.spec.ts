import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME
} from '@careerhub/contracts';
import type { GetMessage } from 'amqplib';
import { peekIamEmailDlq, replayIamEmailDlq } from './replay-iam-email-dlq';

const runtimeConfig = {
  brokerDeadLetterEnabled: true,
  brokerDeadLetterPrefix: 'dlq',
  brokerExchangePrefix: 'careerhub.',
  brokerQueuePrefix: ''
} as never;

function createEmailDlqMessage(messageId = 'email-message-1'): GetMessage {
  return {
    content: Buffer.from(
      JSON.stringify({
        name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
        occurredAt: new Date().toISOString(),
        version: 1,
        payload: {
          email: 'user@example.com',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          identityId: 'identity-1',
          resetTokenId: 'token-1'
        }
      })
    ),
    fields: {
      deliveryTag: 1,
      exchange: 'careerhub.dlq.events',
      redelivered: false,
      routingKey: 'dlq.iam.password-reset-mail'
    },
    properties: {
      headers: {},
      messageId,
      type: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME
    }
  } as GetMessage;
}

test('peekIamEmailDlq inspects messages without ack', async () => {
  const message = createEmailDlqMessage();
  const nacked: GetMessage[] = [];
  const acked: GetMessage[] = [];

  const result = await peekIamEmailDlq(
    { count: 1, runtimeConfig },
    {
      checkQueue: async () => ({ messageCount: 1 }),
      get: async () => message,
      nack: (msg) => { nacked.push(msg); },
      ack: (msg) => { acked.push(msg); },
      publish: async () => undefined
    }
  );

  assert.equal(result.queueDepth, 1);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0]?.messageId, 'email-message-1');
  assert.equal(nacked.length, 1);
  assert.equal(acked.length, 0);
});

test('peekIamEmailDlq does not loop on head message', async () => {
  const message = createEmailDlqMessage();
  const gotten: number[] = [];
  const nacked: GetMessage[] = [];

  const result = await peekIamEmailDlq(
    { count: 3, runtimeConfig },
    {
      checkQueue: async () => ({ messageCount: 1 }),
      get: async () => {
        gotten.push(1);
        return gotten.length === 1 ? message : false;
      },
      nack: (msg) => { nacked.push(msg); },
      ack: () => undefined,
      publish: async () => undefined
    }
  );

  assert.equal(result.messages.length, 1);
  assert.equal(nacked.length, 1);
});

test('replayIamEmailDlq dry-run does not publish or ack', async () => {
  const message = createEmailDlqMessage();
  let publishCalls = 0;
  const acked: GetMessage[] = [];

  const results = await replayIamEmailDlq(
    { dryRun: true, runtimeConfig },
    {
      get: async () => message,
      nack: () => undefined,
      ack: (msg) => { acked.push(msg); },
      publish: async () => { publishCalls += 1; },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'dry_run');
  assert.equal(publishCalls, 0);
  assert.equal(acked.length, 0);
});

test('replayIamEmailDlq acks DLQ message after publish confirm', async () => {
  const message = createEmailDlqMessage();
  const acked: GetMessage[] = [];
  let publishedRoutingKey = '';

  const results = await replayIamEmailDlq(
    { runtimeConfig },
    {
      get: async () => message,
      nack: () => undefined,
      ack: (msg) => { acked.push(msg); },
      publish: async (_exchange, routingKey) => { publishedRoutingKey = routingKey; },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'replayed');
  assert.equal(publishedRoutingKey, IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME);
  assert.equal(acked.length, 1);
});

test('replayIamEmailDlq keeps message in DLQ when publish fails', async () => {
  const message = createEmailDlqMessage();
  const nacked: GetMessage[] = [];
  const acked: GetMessage[] = [];

  const results = await replayIamEmailDlq(
    { runtimeConfig },
    {
      get: async () => message,
      nack: (msg) => { nacked.push(msg); },
      ack: (msg) => { acked.push(msg); },
      publish: async () => { throw new Error('broker unavailable'); },
      checkQueue: async () => ({ messageCount: 1 })
    }
  );

  assert.equal(results[0]?.outcome, 'publish_failed');
  assert.equal(nacked.length, 1);
  assert.equal(acked.length, 0);
});

test('replayIamEmailDlq finds message by messageId and nacks skipped after found', async () => {
  const first = createEmailDlqMessage('first');
  const second = createEmailDlqMessage('second');
  const target = createEmailDlqMessage('target');
  const messages = [first, second, target];
  let getIndex = 0;
  const nackedIds: string[] = [];
  const ackedIds: string[] = [];

  const results = await replayIamEmailDlq(
    { messageId: 'target', runtimeConfig },
    {
      get: async () => messages[getIndex++] ?? false,
      nack: (msg) => { nackedIds.push(msg.properties.messageId as string); },
      ack: (msg) => { ackedIds.push(msg.properties.messageId as string); },
      publish: async () => undefined,
      checkQueue: async () => ({ messageCount: 3 })
    }
  );

  assert.equal(results[0]?.outcome, 'replayed');
  assert.equal(results[0]?.parsed?.messageId, 'target');
  assert.deepEqual(nackedIds, ['first', 'second']);
  assert.deepEqual(ackedIds, ['target']);
});

test('replayIamEmailDlq returns not_found when messageId absent', async () => {
  const results = await replayIamEmailDlq(
    { messageId: 'missing', maxScan: 2, runtimeConfig },
    {
      get: async () => createEmailDlqMessage('other'),
      nack: () => undefined,
      ack: () => undefined,
      publish: async () => undefined,
      checkQueue: async () => ({ messageCount: 2 })
    }
  );

  assert.equal(results[0]?.outcome, 'not_found');
});
