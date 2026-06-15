import type { IntegrationEvent } from '../integration-event';

export const NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME =
  'notifications.application-received.v1';
export const NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME =
  'notifications.application-status-changed.v1';
export const NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME =
  'notifications.interview-scheduled.v1';
export const NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME =
  'notifications.interview-status-changed.v1';
export const NOTIFICATION_OFFER_SENT_EVENT_NAME = 'notifications.offer-sent.v1';
export const NOTIFICATION_OFFER_UPDATED_EVENT_NAME = 'notifications.offer-updated.v1';
export const NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME =
  'notifications.offer-withdrawn.v1';
export const NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME =
  'notifications.offer-accepted.v1';
export const NOTIFICATION_OFFER_DECLINED_EVENT_NAME =
  'notifications.offer-declined.v1';

export const NOTIFICATION_EVENT_NAMES = [
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
  NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME,
  NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME,
  NOTIFICATION_OFFER_SENT_EVENT_NAME,
  NOTIFICATION_OFFER_UPDATED_EVENT_NAME,
  NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME,
  NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME,
  NOTIFICATION_OFFER_DECLINED_EVENT_NAME
] as const;

export type NotificationEventName = (typeof NOTIFICATION_EVENT_NAMES)[number];

export type NotificationRequestedPayload = {
  message: string;
  metadata: Record<string, unknown>;
  recipientIdentityId: string;
  sourceEventId: string;
  title: string;
  type: string;
};

export type NotificationRequestedIntegrationEvent =
  IntegrationEvent<NotificationRequestedPayload> & {
    name: NotificationEventName;
  };

const NOTIFICATION_EVENT_NAME_SET = new Set<string>(NOTIFICATION_EVENT_NAMES);

export const NOTIFICATION_EVENT_NAME_BY_TYPE: Record<string, NotificationEventName> = {
  application_received: NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  application_status_changed: NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
  interview_scheduled: NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME,
  interview_status_changed: NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME,
  offer_accepted: NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME,
  offer_declined: NOTIFICATION_OFFER_DECLINED_EVENT_NAME,
  offer_sent: NOTIFICATION_OFFER_SENT_EVENT_NAME,
  offer_updated: NOTIFICATION_OFFER_UPDATED_EVENT_NAME,
  offer_withdrawn: NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME
};

export function resolveNotificationEventName(
  type: string
): NotificationEventName | undefined {
  return NOTIFICATION_EVENT_NAME_BY_TYPE[type];
}

export function isNotificationRequestedEvent(
  value: unknown
): value is NotificationRequestedIntegrationEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as NotificationRequestedIntegrationEvent;

  return (
    typeof event.name === 'string' &&
    NOTIFICATION_EVENT_NAME_SET.has(event.name) &&
    typeof event.payload === 'object' &&
    event.payload !== null &&
    typeof event.payload.recipientIdentityId === 'string' &&
    typeof event.payload.type === 'string' &&
    typeof event.payload.title === 'string' &&
    typeof event.payload.message === 'string' &&
    typeof event.payload.sourceEventId === 'string' &&
    typeof event.payload.metadata === 'object' &&
    event.payload.metadata !== null
  );
}
