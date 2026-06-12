import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
} from '@careerhub/contracts';
import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';

export type PasswordResetRequestedOutboxInput = {
  email: string;
  expiresAt: string;
  identityId: string;
  occurredAt: string;
  requestId?: string;
  resetTokenId: string;
};

export type IamOutboxRecordFactory = {
  createId: () => string;
};

function toOutboxRecord(
  eventName: string,
  event: IntegrationEvent,
  createId: () => string
): OutboxRecord {
  return {
    eventName,
    id: createId(),
    occurredAt: event.occurredAt,
    payload: event,
    retryCount: 0,
    status: 'pending'
  };
}

export function mapPasswordResetRequestedToIntegrationEvent(
  input: PasswordResetRequestedOutboxInput
): IamPasswordResetRequestedIntegrationEvent {
  return {
    name: IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
    occurredAt: input.occurredAt,
    payload: {
      email: input.email,
      expiresAt: input.expiresAt,
      identityId: input.identityId,
      occurredAt: input.occurredAt,
      resetTokenId: input.resetTokenId
    },
    requestId: input.requestId,
    version: 1
  };
}

export function mapPasswordResetRequestedToOutboxRecord(
  input: PasswordResetRequestedOutboxInput,
  factory: IamOutboxRecordFactory
): OutboxRecord {
  const integrationEvent = mapPasswordResetRequestedToIntegrationEvent(input);
  return toOutboxRecord(
    integrationEvent.name,
    integrationEvent,
    factory.createId
  );
}
