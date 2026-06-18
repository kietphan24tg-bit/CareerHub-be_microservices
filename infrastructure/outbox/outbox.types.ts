import type { OutboxRecord } from '@careerhub/contracts';
import type { MetricsRegistry } from '../observability/metrics/metrics.types';

export type SharedOutboxBacklogSummary = {
  failed: number;
  oldestPendingOccurredAt?: Date;
  pending: number;
  processing: number;
};

export type SharedOutboxFailureRecord = {
  lastError: string;
  nextRetryAt?: Date;
  retryCount: number;
};

export type SharedOutboxRuntimeConfig = {
  outboxBacklogIntervalMs: number;
  outboxBatchSize: number;
  outboxCleanupBatchSize: number;
  outboxCleanupEnabled: boolean;
  outboxCleanupIntervalMs: number;
  outboxFailedRetentionMs: number;
  outboxMaxRetryCount: number;
  outboxPollIntervalMs: number;
  outboxProcessedRetentionMs: number;
  outboxRetryDelayMs: number;
  outboxStaleProcessingTimeoutMs: number;
};

export interface SharedOutboxRepository {
  claimPending(id: string, processingAt: Date): Promise<OutboxRecord | null>;
  create(record: OutboxRecord): Promise<void>;
  deleteFailedBatch(cutoff: Date, limit: number): Promise<number>;
  deleteProcessedBatch(cutoff: Date, limit: number): Promise<number>;
  findPendingBatch(limit: number): Promise<OutboxRecord[]>;
  markFailed(id: string, failure: SharedOutboxFailureRecord): Promise<void>;
  markProcessed(id: string, processedAt: Date): Promise<void>;
  requeueRetryableFailed(now: Date, maxRetryCount: number): Promise<number>;
  requeueStaleProcessing(cutoff: Date): Promise<number>;
  summarizeBacklog(): Promise<SharedOutboxBacklogSummary>;
}

export interface SharedOutboxPublisher {
  isEnabled(): boolean;
  publish(record: OutboxRecord): Promise<void>;
}

export type SharedOutboxProcessorOptions = {
  disabledLogMessage: string;
  loggerName: string;
  metricsRegistry: MetricsRegistry;
  publisher: SharedOutboxPublisher;
  repository: SharedOutboxRepository;
  runtimeConfig: SharedOutboxRuntimeConfig;
  serviceName: string;
};
