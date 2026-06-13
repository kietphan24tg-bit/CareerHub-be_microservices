import type {
  ApplicationHistoryMessage,
  ApplicationMessage,
  InterviewMessage,
  OfferMessage
} from '@careerhub/contracts';
import type {
  ApplicationHistoryRecord,
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  ApplicationRecord
} from '../../../application';
import {
  toGrpcInterviewDetailMessage,
  toGrpcOfferDetailMessage
} from './recruitment-message.mapper';

export function toGrpcApplicationMessage(
  application: ApplicationRecord
): ApplicationMessage {
  return toGrpcEnrichedApplicationMessage({ application });
}

export function toGrpcEnrichedApplicationMessage(input: {
  application: ApplicationRecord;
  interview?: ApplicationInterviewRecord | null;
  offer?: ApplicationOfferRecord | null;
}): ApplicationMessage {
  const nullFields: string[] = [];

  if (input.application.coverLetter === null) {
    nullFields.push('cover_letter');
  }

  return {
    candidate_identity_id: input.application.candidateIdentityId,
    cover_letter: input.application.coverLetter ?? '',
    created_at: input.application.createdAt.toISOString(),
    employer_identity_id: input.application.employerIdentityId,
    id: input.application.id,
    interview: input.interview ? toGrpcInterviewMessage(input.interview) : undefined,
    job_id: input.application.jobId,
    null_fields: nullFields,
    offer: input.offer ? toGrpcOfferMessage(input.offer) : undefined,
    resume_id: input.application.resumeId,
    status: input.application.status,
    updated_at: input.application.updatedAt.toISOString()
  } as unknown as ApplicationMessage;
}

export function toGrpcInterviewMessage(interview: ApplicationInterviewRecord): InterviewMessage {
  return toGrpcInterviewDetailMessage(interview) as unknown as InterviewMessage;
}

export function toGrpcOfferMessage(offer: ApplicationOfferRecord): OfferMessage {
  return toGrpcOfferDetailMessage(offer) as unknown as OfferMessage;
}

export function toGrpcApplicationHistoryMessage(
  history: ApplicationHistoryRecord
): ApplicationHistoryMessage {
  const nullFields: string[] = [];

  if (history.fromStatus === null) {
    nullFields.push('from_status');
  }

  if (history.actorIdentityId === null) {
    nullFields.push('actor_identity_id');
  }

  if (history.note === null) {
    nullFields.push('note');
  }

  return {
    actor_identity_id: history.actorIdentityId ?? '',
    actor_type: history.actorType,
    application_id: history.applicationId,
    created_at: history.createdAt.toISOString(),
    event_type: history.eventType,
    from_status: history.fromStatus ?? '',
    id: history.id,
    null_fields: nullFields,
    note: history.note ?? '',
    to_status: history.toStatus
  } as unknown as ApplicationHistoryMessage;
}

function collectNullFields(pairs: Array<[string, unknown]>): string[] {
  return pairs
    .filter(([, value]) => value === null || value === undefined)
    .map(([field]) => field);
}
