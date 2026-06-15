import assert from 'node:assert/strict';
import test from 'node:test';
import { createIntegrationEvent } from '../rabbitmq-event';
import {
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  isNotificationRequestedEvent,
  resolveNotificationEventName
} from './notification-requested.event';

test('resolveNotificationEventName maps notification types to versioned routing keys', () => {
  assert.equal(
    resolveNotificationEventName('application_received'),
    NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME
  );
  assert.equal(
    resolveNotificationEventName('offer_sent'),
    'notifications.offer-sent.v1'
  );
  assert.equal(resolveNotificationEventName('unknown_type'), undefined);
});

test('isNotificationRequestedEvent validates notification integration events', () => {
  const event = createIntegrationEvent(
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
  );

  assert.equal(isNotificationRequestedEvent(event), true);
  assert.equal(isNotificationRequestedEvent({ ...event, name: 'unknown.v1' }), false);
  assert.equal(
    isNotificationRequestedEvent({
      ...event,
      payload: { ...event.payload, recipientIdentityId: 1 }
    }),
    false
  );
});
