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
  lastCleanupCutoff?: Date;
  lastCleanupLimit?: number;

  async claimPending(): Promise<OutboxRecord | null> {
    this.claimPendingCalls += 1;
    return null;
  }

  async create(): Promise<void> {}

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
    return {
      failed: 0,
      pending: 0,
      processing: 0
    };
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
    passwordResetTokenTtlMs: 15 * 60 * 1000,
    outboxBatchSize: 20,
    outboxCleanupBatchSize: 100,
    outboxCleanupEnabled: true,
    outboxCleanupIntervalMs: 60_000,
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
    PASSWORD_RESET_TOKEN_TTL_MS: config.passwordResetTokenTtlMs,
    OUTBOX_BATCH_SIZE: config.outboxBatchSize,
    OUTBOX_CLEANUP_BATCH_SIZE: config.outboxCleanupBatchSize,
    OUTBOX_CLEANUP_ENABLED: config.outboxCleanupEnabled,
    OUTBOX_CLEANUP_INTERVAL_MS: config.outboxCleanupIntervalMs,
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

function createMetricsRegistry(): MetricsRegistry {
  return {
    recordHttpError() {},
    recordHttpRequest() {},
    recordIntegrationConsumer() {},
    recordOutboxBacklog() {},
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
