import type { IntegrationEvent } from '../integration-event';

export const APPLICATION_CREATED_EVENT_NAME = 'application.created.v1';
export const APPLICATION_STATUS_UPDATED_EVENT_NAME = 'application.status-updated.v1';
export const INTERVIEW_CHANGED_EVENT_NAME = 'application.interview-changed.v1';
export const OFFER_STATUS_CHANGED_EVENT_NAME = 'application.offer-status-changed.v1';

export const APPLICATION_EVENT_NAMES = [
  APPLICATION_CREATED_EVENT_NAME,
  APPLICATION_STATUS_UPDATED_EVENT_NAME,
  INTERVIEW_CHANGED_EVENT_NAME,
  OFFER_STATUS_CHANGED_EVENT_NAME
] as const;

export type ApplicationEventName = (typeof APPLICATION_EVENT_NAMES)[number];

export type ApplicationCreatedPayload = {
  applicationId: string;
  candidateIdentityId: string;
  employerIdentityId: string;
  jobId: string;
};

export type ApplicationStatusUpdatedPayload = {
  applicationId: string;
  candidateIdentityId: string;
  employerIdentityId: string;
  fromStatus: string;
  jobId: string;
  toStatus: string;
};

export type InterviewChangedPayload = {
  applicationId: string;
  candidateIdentityId: string;
  employerIdentityId: string;
  interviewId: string;
  jobId: string;
  status: string;
};

export type OfferStatusChangedPayload = {
  applicationId: string;
  candidateIdentityId: string;
  employerIdentityId: string;
  jobId: string;
  offerId: string;
  status: string;
};

export type ApplicationCreatedIntegrationEvent = IntegrationEvent<ApplicationCreatedPayload> & {
  name: typeof APPLICATION_CREATED_EVENT_NAME;
};

export type ApplicationStatusUpdatedIntegrationEvent =
  IntegrationEvent<ApplicationStatusUpdatedPayload> & {
    name: typeof APPLICATION_STATUS_UPDATED_EVENT_NAME;
  };

export type InterviewChangedIntegrationEvent = IntegrationEvent<InterviewChangedPayload> & {
  name: typeof INTERVIEW_CHANGED_EVENT_NAME;
};

export type OfferStatusChangedIntegrationEvent = IntegrationEvent<OfferStatusChangedPayload> & {
  name: typeof OFFER_STATUS_CHANGED_EVENT_NAME;
};

export type ApplicationIntegrationEvent =
  | ApplicationCreatedIntegrationEvent
  | ApplicationStatusUpdatedIntegrationEvent
  | InterviewChangedIntegrationEvent
  | OfferStatusChangedIntegrationEvent;

export function isApplicationEvent(value: unknown): value is ApplicationIntegrationEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    APPLICATION_EVENT_NAMES.includes((value as ApplicationIntegrationEvent).name)
  );
}
