import type { OutboxBacklogSummary, OutboxRepository } from '../../../application';
import type { OutboxRecord } from '@careerhub/contracts';
import type { ApplicationPrismaRepositoryClient } from '../prisma/application-prisma.types';

function toOutboxRecord(record: {
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
}): OutboxRecord {
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

export class PrismaApplicationOutboxRepository implements OutboxRepository {
  constructor(private readonly prismaClient: ApplicationPrismaRepositoryClient) {}

  async claimPending(id: string, processingAt: Date): Promise<OutboxRecord | null> {
    const result = await this.prismaClient.outbox.updateMany({
      data: {
        processingAt,
        status: 'processing'
      },
      where: {
        id,
        status: 'pending'
      }
    });

    if (result.count === 0) {
      return null;
    }

    const record = await this.prismaClient.outbox.findUnique({
      where: { id }
    });

    return record ? toOutboxRecord(record) : null;
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
      where: {
        processedAt: {
          lt: cutoff
        },
        status: 'processed'
      }
    });

    if (records.length === 0) {
      return 0;
    }

    const result = await this.prismaClient.outbox.deleteMany({
      where: {
        id: {
          in: records.map((record) => record.id)
        }
      }
    });

    return result.count;
  }

  async findPendingBatch(limit: number): Promise<OutboxRecord[]> {
    const records = await this.prismaClient.outbox.findMany({
      orderBy: { occurredAt: 'asc' },
      take: limit,
      where: {
        status: 'pending'
      }
    });

    return records.map(toOutboxRecord);
  }

  async markFailed(
    id: string,
    failure: {
      lastError: string;
      nextRetryAt?: Date;
      retryCount: number;
    }
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
      data: {
        nextRetryAt: null,
        processingAt: null,
        status: 'pending'
      },
      where: {
        nextRetryAt: {
          lte: now
        },
        retryCount: {
          lt: maxRetryCount
        },
        status: 'failed'
      }
    });

    return result.count;
  }

  async requeueStaleProcessing(cutoff: Date): Promise<number> {
    const result = await this.prismaClient.outbox.updateMany({
      data: {
        processingAt: null,
        status: 'pending'
      },
      where: {
        processingAt: {
          lt: cutoff
        },
        status: 'processing'
      }
    });

    return result.count;
  }

  async summarizeBacklog(): Promise<OutboxBacklogSummary> {
    const [pending, processing, failed, oldestPendingRecord] = await Promise.all([
      this.prismaClient.outbox.count({
        where: { status: 'pending' }
      }),
      this.prismaClient.outbox.count({
        where: { status: 'processing' }
      }),
      this.prismaClient.outbox.count({
        where: { status: 'failed' }
      }),
      this.prismaClient.outbox.findFirst({
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
        where: { status: 'pending' }
      })
    ]);

    return {
      failed,
      oldestPendingOccurredAt:
        oldestPendingRecord?.occurredAt instanceof Date
          ? oldestPendingRecord.occurredAt
          : undefined,
      pending,
      processing
    };
  }
}
