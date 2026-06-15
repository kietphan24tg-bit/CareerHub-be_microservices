import type { IntegrationEvent } from '../integration-event';
export declare const NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME = "notifications.application-received.v1";
export declare const NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME = "notifications.application-status-changed.v1";
export declare const NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME = "notifications.interview-scheduled.v1";
export declare const NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME = "notifications.interview-status-changed.v1";
export declare const NOTIFICATION_OFFER_SENT_EVENT_NAME = "notifications.offer-sent.v1";
export declare const NOTIFICATION_OFFER_UPDATED_EVENT_NAME = "notifications.offer-updated.v1";
export declare const NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME = "notifications.offer-withdrawn.v1";
export declare const NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME = "notifications.offer-accepted.v1";
export declare const NOTIFICATION_OFFER_DECLINED_EVENT_NAME = "notifications.offer-declined.v1";
export declare const NOTIFICATION_EVENT_NAMES: readonly ["notifications.application-received.v1", "notifications.application-status-changed.v1", "notifications.interview-scheduled.v1", "notifications.interview-status-changed.v1", "notifications.offer-sent.v1", "notifications.offer-updated.v1", "notifications.offer-withdrawn.v1", "notifications.offer-accepted.v1", "notifications.offer-declined.v1"];
export type NotificationEventName = (typeof NOTIFICATION_EVENT_NAMES)[number];
export type NotificationRequestedPayload = {
    message: string;
    metadata: Record<string, unknown>;
    recipientIdentityId: string;
    sourceEventId: string;
    title: string;
    type: string;
};
export type NotificationRequestedIntegrationEvent = IntegrationEvent<NotificationRequestedPayload> & {
    name: NotificationEventName;
};
export declare const NOTIFICATION_EVENT_NAME_BY_TYPE: Record<string, NotificationEventName>;
export declare function resolveNotificationEventName(type: string): NotificationEventName | undefined;
export declare function isNotificationRequestedEvent(value: unknown): value is NotificationRequestedIntegrationEvent;
