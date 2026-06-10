import type { OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables, MetricsRegistry } from '@careerhub/infrastructure';
import {
  getIamRuntimeConfig,
  type IamEnvironmentVariables,
  type IamRuntimeConfig
} from '../../config';
import { IAM_PORT_TOKENS, type OutboxRepository } from '../../application';
import { IamOutboxPublisher } from './iam-outbox.publisher';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';

@Injectable()
export class IamOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IamOutboxProcessor.name);
  private backlogRunning = false;
  private backlogStateKey = 'pending=0|processing=0|failed=0|oldest=n/a';
  private backlogTimer?: NodeJS.Timeout;
  private cleanupRunning = false;
  private cleanupTimer?: NodeJS.Timeout;
  private publishRunning = false;
  private readonly runtimeConfig: IamRuntimeConfig;
  private pollingTimer?: NodeJS.Timeout;

  constructor(
    @Inject(IAM_PORT_TOKENS.outboxRepository)
    private readonly outboxRepository: OutboxRepository,
    @Inject(IAM_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    private readonly outboxPublisher: IamOutboxPublisher,
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.runtimeConfig = getIamRuntimeConfig(configService);
  }

  async onModuleInit(): Promise<void> {
    if (!this.outboxPublisher.isEnabled()) {
      this.logger.log('IAM outbox publisher is disabled or broker URL is missing');
      return;
    }

    await this.runPublishCycle();
    await this.runBacklogCycle();
    await this.runCleanupCycle();
    this.pollingTimer = setInterval(() => {
      void this.runPublishCycle();
    }, this.runtimeConfig.outboxPollIntervalMs);
    this.backlogTimer = setInterval(() => {
      void this.runBacklogCycle();
    }, this.runtimeConfig.outboxBacklogIntervalMs);

    if (this.runtimeConfig.outboxCleanupEnabled) {
      this.cleanupTimer = setInterval(() => {
        void this.runCleanupCycle();
      }, this.runtimeConfig.outboxCleanupIntervalMs);
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
  }

  private async runCleanupCycle(): Promise<void> {
    if (!this.runtimeConfig.outboxCleanupEnabled || this.cleanupRunning) {
      return;
    }

    this.cleanupRunning = true;

    try {
      const cutoff = new Date(
        Date.now() - this.runtimeConfig.outboxProcessedRetentionMs
      );
      const deleted = await this.outboxRepository.deleteProcessedBatch(
        cutoff,
        this.runtimeConfig.outboxCleanupBatchSize
      );

      if (deleted > 0) {
        this.metricsRegistry.recordOutboxCleanup({
          deletedCount: deleted,
          service: 'iam-service'
        });
        this.logger.log(
          `Outbox cleanup deleted ${deleted} processed records older than ${cutoff.toISOString()}`
        );
      }
    } finally {
      this.cleanupRunning = false;
    }
  }

  private async runPublishCycle(): Promise<void> {
    if (this.publishRunning) {
      return;
    }

    this.publishRunning = true;

    try {
      const now = new Date();

      await this.outboxRepository.requeueStaleProcessing(
        new Date(now.getTime() - this.runtimeConfig.outboxStaleProcessingTimeoutMs)
      );
      await this.outboxRepository.requeueRetryableFailed(
        now,
        this.runtimeConfig.outboxMaxRetryCount
      );

      const pendingRecords = await this.outboxRepository.findPendingBatch(
        this.runtimeConfig.outboxBatchSize
      );

      for (const record of pendingRecords) {
        await this.processRecord(record.id);
      }
    } finally {
      this.publishRunning = false;
    }
  }

  private async runBacklogCycle(): Promise<void> {
    if (this.backlogRunning) {
      return;
    }

    this.backlogRunning = true;

    try {
      const summary = await this.outboxRepository.summarizeBacklog();
      const oldestPendingAgeSeconds = summary.oldestPendingOccurredAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - summary.oldestPendingOccurredAt.getTime()) / 1000
            )
          )
        : 0;

      this.metricsRegistry.recordOutboxBacklog({
        failed: summary.failed,
        oldestPendingAgeSeconds,
        pending: summary.pending,
        processing: summary.processing,
        service: 'iam-service'
      });

      const nextStateKey = this.createBacklogStateKey(summary);

      if (nextStateKey === this.backlogStateKey) {
        return;
      }

      const hadBacklog = !this.backlogStateKey.startsWith('pending=0|processing=0|failed=0|');
      const hasBacklog = summary.pending > 0 || summary.processing > 0 || summary.failed > 0;

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
    }
  }

  private async processRecord(recordId: string): Promise<void> {
    const claimedRecord = await this.outboxRepository.claimPending(
      recordId,
      new Date()
    );

    if (!claimedRecord) {
      return;
    }

    try {
      await this.outboxPublisher.publish(claimedRecord);
      await this.outboxRepository.markProcessed(claimedRecord.id, new Date());
    } catch (error) {
      await this.outboxRepository.markFailed(
        claimedRecord.id,
        this.buildFailureRecord(claimedRecord, error)
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown outbox publish error';
      this.logger.warn(
        `Failed to publish IAM outbox record ${claimedRecord.id}: ${errorMessage}`
      );
    }
  }

  private buildFailureRecord(
    record: OutboxRecord,
    error: unknown
  ): {
    lastError: string;
    nextRetryAt?: Date;
    retryCount: number;
  } {
    const retryCount = record.retryCount + 1;
    const shouldRetry = retryCount < this.runtimeConfig.outboxMaxRetryCount;
    const message = error instanceof Error ? error.message : String(error);

    return {
      lastError: message,
      nextRetryAt: shouldRetry
        ? new Date(Date.now() + this.runtimeConfig.outboxRetryDelayMs)
        : undefined,
      retryCount
    };
  }

  private createBacklogStateKey(summary: {
    failed: number;
    oldestPendingOccurredAt?: Date;
    pending: number;
    processing: number;
  }): string {
    return [
      `pending=${summary.pending}`,
      `processing=${summary.processing}`,
      `failed=${summary.failed}`,
      `oldest=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`
    ].join('|');
  }
}
