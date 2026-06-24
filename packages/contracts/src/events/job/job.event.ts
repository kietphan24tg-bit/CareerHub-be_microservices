import type { IntegrationEvent } from '../integration-event';

export const JOB_PUBLISHED_EVENT_NAME = 'job.published.v1';
export const JOB_UPDATED_EVENT_NAME = 'job.updated.v1';
export const JOB_CLOSED_EVENT_NAME = 'job.closed.v1';
export const JOB_ARCHIVED_EVENT_NAME = 'job.archived.v1';
export const JOB_REOPENED_EVENT_NAME = 'job.reopened.v1';
export const JOB_DELETED_EVENT_NAME = 'job.deleted.v1';

export const JOB_EVENT_NAMES = [
  JOB_PUBLISHED_EVENT_NAME,
  JOB_UPDATED_EVENT_NAME,
  JOB_CLOSED_EVENT_NAME,
  JOB_ARCHIVED_EVENT_NAME,
  JOB_REOPENED_EVENT_NAME,
  JOB_DELETED_EVENT_NAME
] as const;

export type JobEventName = (typeof JOB_EVENT_NAMES)[number];

export type JobEventPayload = {
  employerIdentityId: string;
  jobId: string;
  slug: string;
};

export type JobPublishedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_PUBLISHED_EVENT_NAME;
};

export type JobUpdatedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_UPDATED_EVENT_NAME;
};

export type JobClosedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_CLOSED_EVENT_NAME;
};

export type JobArchivedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_ARCHIVED_EVENT_NAME;
};

export type JobReopenedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_REOPENED_EVENT_NAME;
};

export type JobDeletedIntegrationEvent = IntegrationEvent<JobEventPayload> & {
  name: typeof JOB_DELETED_EVENT_NAME;
};

export type JobIntegrationEvent =
  | JobPublishedIntegrationEvent
  | JobUpdatedIntegrationEvent
  | JobClosedIntegrationEvent
  | JobArchivedIntegrationEvent
  | JobReopenedIntegrationEvent
  | JobDeletedIntegrationEvent;

export function isJobEvent(value: unknown): value is JobIntegrationEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    JOB_EVENT_NAMES.includes((value as JobIntegrationEvent).name)
  );
}
