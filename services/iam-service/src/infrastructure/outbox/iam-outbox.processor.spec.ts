import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboxRecord } from '@careerhub/contracts';
import type { MetricsRegistry } from '@careerhub/infrastructure';
import type {
  IamEnvironmentVariables,
  IamRuntimeConfig
} from '../../config';
import type {
  OutboxBacklogSummary,
  OutboxRepository
} from '../../application';
import { IamOutboxProcessor } from './iam-outbox.processor';

class FakeOutboxRepository implements OutboxRepository {
  claimPendingCalls = 0;
  cleanupCalls = 0;
  deleteDelayMs = 0;
  deletedCounts: number[] = [];
  deletedFailedCounts: number[] = [];
  lastCleanupCutoff?: Date;
  lastCleanupLimit?: number;
  lastFailedCleanupCutoff?: Date;
  lastFailedCleanupLimit?: number;
  summarizeBacklogCalls = 0;
  summary: OutboxBacklogSummary = {
    failed: 0,
    pending: 0,
    processing: 0
  };

  async claimPending(): Promise<OutboxRecord | null> {
    this.claimPendingCalls += 1;
    return null;
  }

  async create(): Promise<void> {}

  async deleteFailedBatch(cutoff: Date, limit: number): Promise<number> {
    this.lastFailedCleanupCutoff = cutoff;
    this.lastFailedCleanupLimit = limit;
    return this.deletedFailedCounts.shift() ?? 0;
  }

  async deleteProcessedBatch(cutoff: Date, limit: number): Promise<number> {
    this.cleanupCalls += 1;
    this.lastCleanupCutoff = cutoff;
    this.lastCleanupLimit = limit;

    if (this.deleteDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.deleteDelayMs));
    }

    const next = this.deletedCounts.shift() ?? 0;
    return next;
  }

  async findPendingBatch(): Promise<OutboxRecord[]> {
    return [];
  }

  async markFailed(): Promise<void> {}

  async markProcessed(): Promise<void> {}

  async requeueRetryableFailed(): Promise<number> {
    return 0;
  }

  async requeueStaleProcessing(): Promise<number> {
    return 0;
  }

  async summarizeBacklog(): Promise<OutboxBacklogSummary> {
    this.summarizeBacklogCalls += 1;
    return this.summary;
  }
}

function createConfigService(
  overrides?: Partial<IamRuntimeConfig>
): {
  getOrThrow(key: keyof IamEnvironmentVariables | string): unknown;
} {
  const config: IamRuntimeConfig = {
    grpcIamUrl: '0.0.0.0:50051',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    jwtSecret: 'secret',
    passwordResetMailClaimTimeoutMs: 60_000,
    passwordResetMailMaxRetries: 3,
    passwordResetSecret: 'password-reset-secret',
    passwordResetTokenTtlMs: 15 * 60 * 1000,
    outboxBacklogIntervalMs: 30_000,
    outboxBatchSize: 20,
    outboxCleanupBatchSize: 100,
    outboxCleanupEnabled: true,
    outboxCleanupIntervalMs: 60_000,
    outboxFailedRetentionMs: 30 * 24 * 60 * 60 * 1000,
    outboxMaxRetryCount: 5,
    outboxPollIntervalMs: 5_000,
    outboxProcessedRetentionMs: 7 * 24 * 60 * 60 * 1000,
    outboxPublishEnabled: true,
    outboxRetryDelayMs: 30_000,
    outboxStaleProcessingTimeoutMs: 60_000,
    ...overrides
  };

  const values: Record<string, unknown> = {
    GRPC_IAM_URL: config.grpcIamUrl,
    JWT_EXPIRES_IN: config.jwtExpiresIn,
    JWT_REFRESH_EXPIRES_IN: config.jwtRefreshExpiresIn,
    JWT_SECRET: config.jwtSecret,
    PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS: config.passwordResetMailClaimTimeoutMs,
    PASSWORD_RESET_SECRET: config.passwordResetSecret,
    PASSWORD_RESET_TOKEN_TTL_MS: config.passwordResetTokenTtlMs,
    OUTBOX_BACKLOG_INTERVAL_MS: config.outboxBacklogIntervalMs,
    OUTBOX_BATCH_SIZE: config.outboxBatchSize,
    OUTBOX_CLEANUP_BATCH_SIZE: config.outboxCleanupBatchSize,
    OUTBOX_CLEANUP_ENABLED: config.outboxCleanupEnabled,
    OUTBOX_CLEANUP_INTERVAL_MS: config.outboxCleanupIntervalMs,
    OUTBOX_FAILED_RETENTION_MS: config.outboxFailedRetentionMs,
    OUTBOX_MAX_RETRY_COUNT: config.outboxMaxRetryCount,
    OUTBOX_POLL_INTERVAL_MS: config.outboxPollIntervalMs,
    OUTBOX_PROCESSED_RETENTION_MS: config.outboxProcessedRetentionMs,
    OUTBOX_PUBLISH_ENABLED: config.outboxPublishEnabled,
    OUTBOX_RETRY_DELAY_MS: config.outboxRetryDelayMs,
    OUTBOX_STALE_PROCESSING_TIMEOUT_MS: config.outboxStaleProcessingTimeoutMs
  };

  return {
    getOrThrow(key: string): unknown {
      return values[key];
    }
  };
}

function createMetricsRegistry(): MetricsRegistry & {
  backlogRecords: Array<{
    failed: number;
    oldestPendingAgeSeconds?: number;
    pending: number;
    processing: number;
    service: string;
  }>;
} {
  const backlogRecords: Array<{
    failed: number;
    oldestPendingAgeSeconds?: number;
    pending: number;
    processing: number;
    service: string;
  }> = [];

  return {
    backlogRecords,
    recordHttpError() {},
    recordHttpRequest() {},
    recordIntegrationConsumer() {},
    recordOutboxBacklog(record) {
      backlogRecords.push(record);
    },
    recordOutboxCleanup() {},
    recordOutboxPublish() {},
    recordRmqError() {},
    recordRmqRequest() {},
    recordRpcError() {},
    recordRpcRequest() {},
    renderPrometheus() {
      return '';
    }
  };
}

test('cleanup cycle deletes processed records with retention cutoff and batch size', async () => {
  const repository = new FakeOutboxRepository();
  repository.deletedCounts = [3];
  const processor = new IamOutboxProcessor(
    repository,
    createMetricsRegistry(),
    {
      isEnabled: () => true,
      publish: async () => undefined
    } as never,
    createConfigService({
      outboxCleanupBatchSize: 25,
      outboxProcessedRetentionMs: 1_000
    }) as never
  );

  await (processor as any).runCleanupCycle();

  assert.equal(repository.cleanupCalls, 1);
  assert.equal(repository.lastCleanupLimit, 25);
  assert.ok(repository.lastCleanupCutoff instanceof Date);
});

test('cleanup guard skips overlapping cleanup cycles', async () => {
  const repository = new FakeOutboxRepository();
  repository.deletedCounts = [1];
  repository.deleteDelayMs = 30;
  const processor = new IamOutboxProcessor(
    repository,
    createMetricsRegistry(),
    {
      isEnabled: () => true,
      publish: async () => undefined
    } as never,
    createConfigService() as never
  );

  const firstRun = (processor as any).runCleanupCycle();
  await (processor as any).runCleanupCycle();
  await firstRun;

  assert.equal(repository.cleanupCalls, 1);
});

test('publish cycle does not summarize backlog metrics', async () => {
  const repository = new FakeOutboxRepository();
  const metricsRegistry = createMetricsRegistry();
  const processor = new IamOutboxProcessor(
    repository,
    metricsRegistry,
    {
      isEnabled: () => true,
      publish: async () => undefined
    } as never,
    createConfigService() as never
  );

  await (processor as any).runPublishCycle();

  assert.equal(repository.summarizeBacklogCalls, 0);
  assert.equal(metricsRegistry.backlogRecords.length, 0);
});

test('cleanup cycle deletes failed records with failed retention cutoff', async () => {
  const repository = new FakeOutboxRepository();
  repository.deletedFailedCounts = [2];
  const processor = new IamOutboxProcessor(
    repository,
    createMetricsRegistry(),
    {
      isEnabled: () => true,
      publish: async () => undefined
    } as never,
    createConfigService({
      outboxCleanupBatchSize: 25,
      outboxFailedRetentionMs: 30 * 24 * 60 * 60 * 1000
    }) as never
  );

  await (processor as any).runCleanupCycle();

  assert.ok(repository.lastFailedCleanupCutoff instanceof Date);
  assert.equal(repository.lastFailedCleanupLimit, 25);
});

test('backlog cycle summarizes backlog and records metrics', async () => {
  const repository = new FakeOutboxRepository();
  repository.summary = {
    failed: 1,
    oldestPendingOccurredAt: new Date(Date.now() - 5_000),
    pending: 2,
    processing: 3
  };
  const metricsRegistry = createMetricsRegistry();
  const processor = new IamOutboxProcessor(
    repository,
    metricsRegistry,
    {
      isEnabled: () => true,
      publish: async () => undefined
    } as never,
    createConfigService() as never
  );

  await (processor as any).runBacklogCycle();

  assert.equal(repository.summarizeBacklogCalls, 1);
  assert.equal(metricsRegistry.backlogRecords.length, 1);
  assert.equal(metricsRegistry.backlogRecords[0]?.pending, 2);
  assert.equal(metricsRegistry.backlogRecords[0]?.processing, 3);
  assert.equal(metricsRegistry.backlogRecords[0]?.failed, 1);
});
