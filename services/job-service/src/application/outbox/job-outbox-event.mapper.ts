import { createIntegrationEvent, type IntegrationEvent, type OutboxRecord } from '@careerhub/contracts';
import type { OutboxRepository } from '../ports';

export type JobOutboxRecordFactory = {
  createOutboxId: () => string;
};

export function mapIntegrationEventToOutboxRecord(
  event: IntegrationEvent,
  factory: JobOutboxRecordFactory
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

export async function persistJobOutbox(
  outboxRepository: OutboxRepository,
  event: IntegrationEvent,
  factory: JobOutboxRecordFactory
): Promise<void> {
  await outboxRepository.create(mapIntegrationEventToOutboxRecord(event, factory));
}
