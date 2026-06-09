import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
} from '@careerhub/contracts';
import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';
import {
  IdentityDisabledEvent,
  UserRegisteredEvent,
  UserRoleChangedEvent
} from '../../domain';

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

export function mapIamDomainEventToIntegrationEvent(
  event: UserRegisteredEvent | UserRoleChangedEvent | IdentityDisabledEvent
): IntegrationEvent {
  const occurredAt = new Date(event.metadata.timestamp).toISOString();
  const requestId = event.metadata.correlationId;

  if (event instanceof UserRegisteredEvent) {
    return {
      name: 'iam.user.registered.v1',
      occurredAt,
      payload: {
        acceptedTerms: event.acceptedTerms,
        email: event.email,
        identityId: event.aggregateId.toString(),
        occurredAt,
        role: event.role
      },
      requestId,
      version: 1
    };
  }

  if (event instanceof UserRoleChangedEvent) {
    return {
      name: 'iam.identity.role_changed.v1',
      occurredAt,
      payload: {
        identityId: event.aggregateId.toString(),
        nextRole: event.nextRole,
        occurredAt,
        previousRole: event.previousRole
      },
      requestId,
      version: 1
    };
  }

  return {
    name: 'iam.identity.disabled.v1',
    occurredAt,
    payload: {
      identityId: event.aggregateId.toString(),
      occurredAt,
      previousStatus: event.previousStatus
    },
    requestId,
    version: 1
  };
}

export function mapIamDomainEventToOutboxRecord(
  event: UserRegisteredEvent | UserRoleChangedEvent | IdentityDisabledEvent,
  factory: IamOutboxRecordFactory
): OutboxRecord {
  const integrationEvent = mapIamDomainEventToIntegrationEvent(event);
  return toOutboxRecord(integrationEvent.name, integrationEvent, factory.createId);
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
