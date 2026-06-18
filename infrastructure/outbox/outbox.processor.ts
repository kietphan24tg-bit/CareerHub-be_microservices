import type { OutboxRecord } from '@careerhub/contracts';
import { Logger } from '@nestjs/common';
import type {
  SharedOutboxBacklogSummary,
  SharedOutboxFailureRecord,
  SharedOutboxProcessorOptions
} from './outbox.types';

export class OutboxProcessor {
  private readonly logger: Logger;
  private backlogRunning = false;
  private backlogStateKey = 'pending=0|processing=0|failed=0|oldest=n/a';
  private backlogTimer?: NodeJS.Timeout;
  private cleanupRunning = false;
  private cleanupTimer?: NodeJS.Timeout;
  private pollingTimer?: NodeJS.Timeout;
  private publishRunning = false;
  private shutdownResolve?: () => void;

  constructor(private readonly options: SharedOutboxProcessorOptions) {
    this.logger = new Logger(options.loggerName);
  }

  async onModuleInit(): Promise<void> {
    if (!this.options.publisher.isEnabled()) {
      this.logger.log(this.options.disabledLogMessage);
      return;
    }

    await this.runPublishCycle();
    await this.runBacklogCycle();
    await this.runCleanupCycle();

    this.pollingTimer = setInterval(() => {
      void this.runPublishCycle();
    }, this.options.runtimeConfig.outboxPollIntervalMs);

    this.backlogTimer = setInterval(() => {
      void this.runBacklogCycle();
    }, this.options.runtimeConfig.outboxBacklogIntervalMs);

    if (this.options.runtimeConfig.outboxCleanupEnabled) {
      this.cleanupTimer = setInterval(() => {
        void this.runCleanupCycle();
      }, this.options.runtimeConfig.outboxCleanupIntervalMs);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    if (this.backlogTimer) {
      clearInterval(this.backlogTimer);
      this.backlogTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.publishRunning || this.cleanupRunning || this.backlogRunning) {
      await Promise.race([
        new Promise<void>((resolve) => {
          this.shutdownResolve = resolve;
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000))
      ]);
    }
  }

  async runCleanupCycle(): Promise<void> {
    if (
      !this.options.runtimeConfig.outboxCleanupEnabled ||
      this.cleanupRunning
    ) {
      return;
    }

    this.cleanupRunning = true;

    try {
      const processedCutoff = new Date(
        Date.now() - this.options.runtimeConfig.outboxProcessedRetentionMs
      );
      const deleted = await this.options.repository.deleteProcessedBatch(
        processedCutoff,
        this.options.runtimeConfig.outboxCleanupBatchSize
      );

      if (deleted > 0) {
        this.options.metricsRegistry.recordOutboxCleanup({
          deletedCount: deleted,
          service: this.options.serviceName
        });
        this.logger.log(
          `Outbox cleanup deleted ${deleted} processed records older than ${processedCutoff.toISOString()}`
        );
      }

      const failedCutoff = new Date(
        Date.now() - this.options.runtimeConfig.outboxFailedRetentionMs
      );
      const deletedFailed = await this.options.repository.deleteFailedBatch(
        failedCutoff,
        this.options.runtimeConfig.outboxCleanupBatchSize
      );

      if (deletedFailed > 0) {
        this.options.metricsRegistry.recordOutboxCleanup({
          deletedCount: deletedFailed,
          service: this.options.serviceName
        });
        this.logger.log(
          `Outbox cleanup deleted ${deletedFailed} failed records older than ${failedCutoff.toISOString()}`
        );
      }
    } finally {
      this.cleanupRunning = false;
      this.shutdownResolve?.();
    }
  }

  async runPublishCycle(): Promise<void> {
    if (this.publishRunning) {
      return;
    }

    this.publishRunning = true;

    try {
      const now = new Date();

      await this.options.repository.requeueStaleProcessing(
        new Date(
          now.getTime() -
            this.options.runtimeConfig.outboxStaleProcessingTimeoutMs
        )
      );
      await this.options.repository.requeueRetryableFailed(
        now,
        this.options.runtimeConfig.outboxMaxRetryCount
      );

      const claimedRecords =
        await this.options.repository.findAndClaimPendingBatch(
          now,
          this.options.runtimeConfig.outboxBatchSize
        );

      const concurrency = this.options.runtimeConfig.outboxPublishConcurrency;

      for (let i = 0; i < claimedRecords.length; i += concurrency) {
        await Promise.all(
          claimedRecords
            .slice(i, i + concurrency)
            .map((record) => this.publishClaimedRecord(record))
        );
      }
    } finally {
      this.publishRunning = false;
      this.shutdownResolve?.();
    }
  }

  async runBacklogCycle(): Promise<void> {
    if (this.backlogRunning) {
      return;
    }

    this.backlogRunning = true;

    try {
      const summary = await this.options.repository.summarizeBacklog();
      const oldestPendingAgeSeconds = summary.oldestPendingOccurredAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - summary.oldestPendingOccurredAt.getTime()) / 1000
            )
          )
        : 0;

      this.options.metricsRegistry.recordOutboxBacklog({
        failed: summary.failed,
        oldestPendingAgeSeconds,
        pending: summary.pending,
        processing: summary.processing,
        service: this.options.serviceName
      });

      const nextStateKey = this.createBacklogStateKey(summary);

      if (nextStateKey === this.backlogStateKey) {
        return;
      }

      const hadBacklog = !this.backlogStateKey.startsWith(
        'pending=0|processing=0|failed=0|'
      );
      const hasBacklog =
        summary.pending > 0 || summary.processing > 0 || summary.failed > 0;

      if (hasBacklog) {
        this.logger.log(
          `Outbox backlog pending=${summary.pending} processing=${summary.processing} failed=${summary.failed} oldestPending=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`
        );
      } else if (hadBacklog) {
        this.logger.log('Outbox backlog cleared');
      }

      this.backlogStateKey = nextStateKey;
    } finally {
      this.backlogRunning = false;
      this.shutdownResolve?.();
    }
  }

  private async publishClaimedRecord(record: OutboxRecord): Promise<void> {
    try {
      await this.options.publisher.publish(record);
      await this.options.repository.markProcessed(record.id, new Date());
    } catch (error) {
      await this.options.repository.markFailed(
        record.id,
        this.buildFailureRecord(record, error)
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown outbox publish error';
      this.logger.warn(
        `Failed to publish ${this.options.serviceName} outbox record ${record.id}: ${errorMessage}`
      );
    }
  }

  private buildFailureRecord(
    record: OutboxRecord,
    error: unknown
  ): SharedOutboxFailureRecord {
    const retryCount = record.retryCount + 1;
    const shouldRetry =
      retryCount < this.options.runtimeConfig.outboxMaxRetryCount;
    const rawMessage = error instanceof Error ? error.message : String(error);
    const lastError =
      rawMessage.length > 2000 ? `${rawMessage.slice(0, 2000)}…` : rawMessage;

    return {
      lastError,
      nextRetryAt: shouldRetry
        ? new Date(
            Date.now() +
              this.options.runtimeConfig.outboxRetryDelayMs *
                Math.pow(2, retryCount - 1)
          )
        : undefined,
      retryCount
    };
  }

  private createBacklogStateKey(summary: SharedOutboxBacklogSummary): string {
    return [
      `pending=${summary.pending}`,
      `processing=${summary.processing}`,
      `failed=${summary.failed}`,
      `oldest=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`
    ].join('|');
  }
}
