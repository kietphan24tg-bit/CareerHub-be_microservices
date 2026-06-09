import type { OutboxRecord } from '@careerhub/contracts';

export type OutboxBacklogSummary = {
  failed: number;
  oldestPendingOccurredAt?: Date;
  pending: number;
  processing: number;
};

export interface OutboxRepository {
  claimPending(id: string, processingAt: Date): Promise<OutboxRecord | null>;
  create(record: OutboxRecord): Promise<void>;
  deleteProcessedBatch(cutoff: Date, limit: number): Promise<number>;
  findPendingBatch(limit: number): Promise<OutboxRecord[]>;
  markFailed(
    id: string,
    failure: {
      lastError: string;
      nextRetryAt?: Date;
      retryCount: number;
    }
  ): Promise<void>;
  markProcessed(id: string, processedAt: Date): Promise<void>;
  requeueRetryableFailed(now: Date, maxRetryCount: number): Promise<number>;
  requeueStaleProcessing(cutoff: Date): Promise<number>;
  summarizeBacklog(): Promise<OutboxBacklogSummary>;
}
