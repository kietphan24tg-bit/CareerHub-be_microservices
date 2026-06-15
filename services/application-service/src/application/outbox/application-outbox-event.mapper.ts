import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';
import type { OutboxRepository } from '../ports';

export type ApplicationOutboxRecordFactory = {
  createOutboxId: () => string;
};

export function mapIntegrationEventToOutboxRecord(
  event: IntegrationEvent,
  factory: ApplicationOutboxRecordFactory
): OutboxRecord {
  return {
    eventName: event.name,
    id: factory.createOutboxId(),
    occurredAt: event.occurredAt,
    payload: event,
    retryCount: 0,
    status: 'pending'
  };
}

export async function persistNotificationOutbox(
  outboxRepository: OutboxRepository,
  event: IntegrationEvent,
  factory: ApplicationOutboxRecordFactory
): Promise<void> {
  await outboxRepository.create(mapIntegrationEventToOutboxRecord(event, factory));
}
