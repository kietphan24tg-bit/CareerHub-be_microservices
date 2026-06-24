import type { OutboxRecord } from '@careerhub/contracts';

export type OutboxPersistenceShape = {
  eventName: string;
  id: string;
  lastError: string | null;
  nextRetryAt: Date | null;
  occurredAt: Date;
  payload: OutboxRecord['payload'];
  processingAt: Date | null;
  processedAt: Date | null;
  retryCount: number;
  status: OutboxRecord['status'];
};

function readString(record: Record<string, unknown>, camel: string, snake: string): string | null {
  const value = record[camel] ?? record[snake];
  return value == null ? null : String(value);
}

function readDate(record: Record<string, unknown>, camel: string, snake: string): Date | null {
  const value = record[camel] ?? record[snake];
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(String(value));
}

export function normalizeOutboxPersistenceRecord(
  record: Record<string, unknown>
): OutboxPersistenceShape {
  const occurredAt = readDate(record, 'occurredAt', 'occurred_at');
  if (!occurredAt) {
    throw new Error('Outbox record is missing occurredAt');
  }

  return {
    eventName: String(record.eventName ?? record.event_name),
    id: String(record.id),
    lastError: readString(record, 'lastError', 'last_error'),
    nextRetryAt: readDate(record, 'nextRetryAt', 'next_retry_at'),
    occurredAt,
    payload: (record.payload ?? {}) as OutboxRecord['payload'],
    processingAt: readDate(record, 'processingAt', 'processing_at'),
    processedAt: readDate(record, 'processedAt', 'processed_at'),
    retryCount: Number(record.retryCount ?? record.retry_count ?? 0),
    status: String(record.status ?? 'pending') as OutboxRecord['status']
  };
}

export function toOutboxRecord(record: OutboxPersistenceShape): OutboxRecord {
  return {
    eventName: record.eventName,
    id: record.id,
    lastError: record.lastError ?? undefined,
    nextRetryAt: record.nextRetryAt?.toISOString(),
    occurredAt: record.occurredAt.toISOString(),
    payload: record.payload,
    processingAt: record.processingAt?.toISOString(),
    processedAt: record.processedAt?.toISOString(),
    retryCount: record.retryCount,
    status: record.status
  };
}