import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';
import type {
  CandidateProfileRecord,
  UpdateCandidateProfilePatch
} from '../ports';

export type CandidateOutboxRecordFactory = {
  createId: () => string;
};

export function mapCandidateProfileUpdatedIntegrationEvent(
  profile: CandidateProfileRecord,
  patch: UpdateCandidateProfilePatch,
  requestId?: string
): IntegrationEvent {
  const occurredAt = profile.updatedAt.toISOString();

  return {
    name: 'candidate.profile.updated.v1',
    occurredAt,
    payload: {
      identityId: profile.identityId,
      occurredAt,
      patch,
      profileId: profile.id
    },
    requestId,
    version: 1
  };
}

export function mapCandidateIntegrationEventToOutboxRecord(
  event: IntegrationEvent,
  factory: CandidateOutboxRecordFactory
): OutboxRecord {
  return {
    eventName: event.name,
    id: factory.createId(),
    occurredAt: event.occurredAt,
    payload: event,
    retryCount: 0,
    status: 'pending'
  };
}
