import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
  createIntegrationEvent
} from '@careerhub/contracts';
import type { GetMessage } from 'amqplib';
import { parseDlqMessage, resolveDlqRoutingKey } from './dlq-message-utils';

function createDlqMessage(input: {
  body: unknown;
  messageId?: string;
  routingKey?: string;
  type?: string;
  xDeathRoutingKeys?: string[];
}): GetMessage {
  const headers: Record<string, unknown> = {};
  if (input.xDeathRoutingKeys) {
    headers['x-death'] = [{ 'routing-keys': input.xDeathRoutingKeys }];
  }

  return {
    content: Buffer.from(JSON.stringify(input.body)),
    fields: {
      deliveryTag: 1,
      exchange: 'careerhub.dlq.events',
      redelivered: false,
      routingKey: input.routingKey ?? 'dlq.communication.notifications'
    },
    properties: {
      headers,
      messageId: input.messageId ?? 'broker-message-1',
      type: input.type
    }
  } as GetMessage;
}

test('resolveDlqRoutingKey prefers explicit override', () => {
  const message = createDlqMessage({
    body: { name: 'ignored' },
    type: NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
  });

  assert.equal(
    resolveDlqRoutingKey(message, NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME),
    'notifications.application-status-changed.v1'
  );
});

test('resolveDlqRoutingKey uses AMQP type property from outbox publisher', () => {
  const message = createDlqMessage({
    body: {},
    type: NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
  });

  assert.equal(resolveDlqRoutingKey(message), NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
});

test('resolveDlqRoutingKey falls back to event name in payload', () => {
  const message = createDlqMessage({
    body: createIntegrationEvent(
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
  });

  assert.equal(resolveDlqRoutingKey(message), NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
});

test('parseDlqMessage extracts messageId, sourceEventId, and event name', () => {
  const message = createDlqMessage({
    body: createIntegrationEvent(
      NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
      {
        message: 'hello',
        metadata: { applicationId: 'app-1' },
        recipientIdentityId: 'identity-1',
        sourceEventId: 'source-1',
        title: 'title',
        type: 'application_received'
      },
      'req-1'
    ),
    messageId: 'outbox-record-1',
    type: NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
  });

  const parsed = parseDlqMessage(message);
  assert.equal(parsed.messageId, 'outbox-record-1');
  assert.equal(parsed.eventName, NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
  assert.equal(parsed.sourceEventId, 'source-1');
  assert.equal(parsed.routingKey, NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
});
