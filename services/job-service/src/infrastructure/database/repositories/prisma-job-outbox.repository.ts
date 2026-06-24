import type { OutboxBacklogSummary, OutboxRepository } from '../../../application';
import type { OutboxRecord } from '@careerhub/contracts';
import {
  normalizeOutboxPersistenceRecord,
  toOutboxRecord,
  type OutboxPersistenceShape
} from '@careerhub/infrastructure';
import type { JobPrismaClient } from '../prisma/job-prisma.types';

export class PrismaJobOutboxRepository implements OutboxRepository {
  constructor(private readonly prismaClient: JobPrismaClient) {}

  async claimPending(id: string, processingAt: Date): Promise<OutboxRecord | null> {
    const result = await this.prismaClient.outbox.updateMany({
      data: { processingAt, status: 'processing' },
      where: { id, status: 'pending' }
    });

    if (result.count === 0) {
      return null;
    }

    const record = await this.prismaClient.outbox.findUnique({ where: { id } });
    return record ? toOutboxRecord(record as OutboxPersistenceShape) : null;
  }

  async create(record: OutboxRecord): Promise<void> {
    await this.prismaClient.outbox.create({
      data: {
        eventName: record.eventName,
        id: record.id,
        lastError: record.lastError ?? null,
        nextRetryAt: record.nextRetryAt ? new Date(record.nextRetryAt) : null,
        occurredAt: new Date(record.occurredAt),
        payload: record.payload,
        processingAt: record.processingAt ? new Date(record.processingAt) : null,
        processedAt: record.processedAt ? new Date(record.processedAt) : null,
        retryCount: record.retryCount,
        status: record.status
      }
    });
  }

  async deleteProcessedBatch(cutoff: Date, limit: number): Promise<number> {
    const records = await this.prismaClient.outbox.findMany({
      orderBy: { occurredAt: 'asc' },
      select: { id: true },
      take: limit,
      where: { processedAt: { lt: cutoff }, status: 'processed' }
    });

    if (records.length === 0) return 0;

    const result = await this.prismaClient.outbox.deleteMany({
      where: { id: { in: records.map((r) => (r as { id: string }).id) } }
    });

    return result.count;
  }

  async deleteFailedBatch(cutoff: Date, limit: number): Promise<number> {
    const records = await this.prismaClient.outbox.findMany({
      orderBy: { occurredAt: 'asc' },
      select: { id: true },
      take: limit,
      where: {
        nextRetryAt: null,
        occurredAt: { lt: cutoff },
        status: 'failed'
      }
    });

    if (records.length === 0) return 0;

    const result = await this.prismaClient.outbox.deleteMany({
      where: { id: { in: records.map((r) => (r as { id: string }).id) } }
    });

    return result.count;
  }

  async findAndClaimPendingBatch(processingAt: Date, limit: number): Promise<OutboxRecord[]> {
    const raw = this.prismaClient as unknown as {
      $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>;
    };
    const records = await raw.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE outbox
       SET status = 'processing', processing_at = $1
       WHERE id IN (
         SELECT id FROM outbox
         WHERE status = 'pending'
         ORDER BY occurred_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      processingAt,
      limit
    );

    return records.map((record) =>
      toOutboxRecord(normalizeOutboxPersistenceRecord(record))
    );
  }

  async findPendingBatch(limit: number): Promise<OutboxRecord[]> {
    const records = await this.prismaClient.outbox.findMany({
      orderBy: { occurredAt: 'asc' },
      take: limit,
      where: { status: 'pending' }
    });

    return records.map((record) => toOutboxRecord(record as OutboxPersistenceShape));
  }

  async markFailed(
    id: string,
    failure: { lastError: string; nextRetryAt?: Date; retryCount: number }
  ): Promise<void> {
    await this.prismaClient.outbox.update({
      data: {
        lastError: failure.lastError,
        nextRetryAt: failure.nextRetryAt ?? null,
        processedAt: null,
        processingAt: null,
        retryCount: failure.retryCount,
        status: 'failed'
      },
      where: { id }
    });
  }

  async markProcessed(id: string, processedAt: Date): Promise<void> {
    await this.prismaClient.outbox.update({
      data: {
        lastError: null,
        nextRetryAt: null,
        processedAt,
        processingAt: null,
        status: 'processed'
      },
      where: { id }
    });
  }

  async requeueRetryableFailed(now: Date, maxRetryCount: number): Promise<number> {
    const result = await this.prismaClient.outbox.updateMany({
      data: { nextRetryAt: null, processingAt: null, status: 'pending' },
      where: {
        nextRetryAt: { lte: now },
        retryCount: { lt: maxRetryCount },
        status: 'failed'
      }
    });

    return result.count;
  }

  async requeueStaleProcessing(cutoff: Date): Promise<number> {
    const result = await this.prismaClient.outbox.updateMany({
      data: { processingAt: null, status: 'pending' },
      where: { processingAt: { lt: cutoff }, status: 'processing' }
    });

    return result.count;
  }

  async summarizeBacklog(): Promise<OutboxBacklogSummary> {
    const [pending, processing, failed, oldestPendingRecord] = await Promise.all([
      this.prismaClient.outbox.count({ where: { status: 'pending' } }),
      this.prismaClient.outbox.count({ where: { status: 'processing' } }),
      this.prismaClient.outbox.count({ where: { status: 'failed' } }),
      this.prismaClient.outbox.findFirst({
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
        where: { status: 'pending' }
      })
    ]);

    return {
      failed,
      oldestPendingOccurredAt:
        oldestPendingRecord &&
        'occurredAt' in oldestPendingRecord &&
        oldestPendingRecord.occurredAt instanceof Date
          ? oldestPendingRecord.occurredAt
          : undefined,
      pending,
      processing
    };
  }
}
