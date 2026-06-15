"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_EVENT_NAME_BY_TYPE = exports.NOTIFICATION_EVENT_NAMES = exports.NOTIFICATION_OFFER_DECLINED_EVENT_NAME = exports.NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME = exports.NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME = exports.NOTIFICATION_OFFER_UPDATED_EVENT_NAME = exports.NOTIFICATION_OFFER_SENT_EVENT_NAME = exports.NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME = exports.NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME = exports.NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME = exports.NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME = void 0;
exports.resolveNotificationEventName = resolveNotificationEventName;
exports.isNotificationRequestedEvent = isNotificationRequestedEvent;
exports.NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME = 'notifications.application-received.v1';
exports.NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME = 'notifications.application-status-changed.v1';
exports.NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME = 'notifications.interview-scheduled.v1';
exports.NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME = 'notifications.interview-status-changed.v1';
exports.NOTIFICATION_OFFER_SENT_EVENT_NAME = 'notifications.offer-sent.v1';
exports.NOTIFICATION_OFFER_UPDATED_EVENT_NAME = 'notifications.offer-updated.v1';
exports.NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME = 'notifications.offer-withdrawn.v1';
exports.NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME = 'notifications.offer-accepted.v1';
exports.NOTIFICATION_OFFER_DECLINED_EVENT_NAME = 'notifications.offer-declined.v1';
exports.NOTIFICATION_EVENT_NAMES = [
    exports.NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
    exports.NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
    exports.NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME,
    exports.NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME,
    exports.NOTIFICATION_OFFER_SENT_EVENT_NAME,
    exports.NOTIFICATION_OFFER_UPDATED_EVENT_NAME,
    exports.NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME,
    exports.NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME,
    exports.NOTIFICATION_OFFER_DECLINED_EVENT_NAME
];
const NOTIFICATION_EVENT_NAME_SET = new Set(exports.NOTIFICATION_EVENT_NAMES);
exports.NOTIFICATION_EVENT_NAME_BY_TYPE = {
    application_received: exports.NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
    application_status_changed: exports.NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
    interview_scheduled: exports.NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME,
    interview_status_changed: exports.NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME,
    offer_accepted: exports.NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME,
    offer_declined: exports.NOTIFICATION_OFFER_DECLINED_EVENT_NAME,
    offer_sent: exports.NOTIFICATION_OFFER_SENT_EVENT_NAME,
    offer_updated: exports.NOTIFICATION_OFFER_UPDATED_EVENT_NAME,
    offer_withdrawn: exports.NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME
};
function resolveNotificationEventName(type) {
    return exports.NOTIFICATION_EVENT_NAME_BY_TYPE[type];
}
function isNotificationRequestedEvent(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const event = value;
    return (typeof event.name === 'string' &&
        NOTIFICATION_EVENT_NAME_SET.has(event.name) &&
        typeof event.payload === 'object' &&
        event.payload !== null &&
        typeof event.payload.recipientIdentityId === 'string' &&
        typeof event.payload.type === 'string' &&
        typeof event.payload.title === 'string' &&
        typeof event.payload.message === 'string' &&
        typeof event.payload.sourceEventId === 'string' &&
        typeof event.payload.metadata === 'object' &&
        event.payload.metadata !== null);
}
