import type { OutboxRecord } from '@careerhub/contracts';
import type { EnvironmentVariables, MetricsRegistry } from '@careerhub/infrastructure';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getCandidateRuntimeConfig,
  type CandidateEnvironmentVariables,
  type CandidateRuntimeConfig
} from '../../config';
import {
  CANDIDATE_PORT_TOKENS,
  type CandidateOutboxRepository
} from '../../application';
import { CandidateOutboxPublisher } from './candidate-outbox.publisher';
import { CANDIDATE_METRICS_TOKENS } from '../metrics/candidate-metrics.constants';

@Injectable()
export class CandidateOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CandidateOutboxProcessor.name);
  private cleanupRunning = false;
  private cleanupTimer?: NodeJS.Timeout;
  private publishRunning = false;
  private readonly runtimeConfig: CandidateRuntimeConfig;
  private pollingTimer?: NodeJS.Timeout;

  constructor(
    @Inject(CANDIDATE_PORT_TOKENS.outboxRepository)
    private readonly outboxRepository: CandidateOutboxRepository,
    @Inject(CANDIDATE_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    private readonly outboxPublisher: CandidateOutboxPublisher,
    configService: ConfigService<
      CandidateEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {
    this.runtimeConfig = getCandidateRuntimeConfig(configService);
  }

  async onModuleInit(): Promise<void> {
    if (!this.outboxPublisher.isEnabled()) {
      this.logger.log('Candidate outbox publisher is disabled or broker URL is missing');
      return;
    }

    await this.runPublishCycle();
    await this.runCleanupCycle();
    this.pollingTimer = setInterval(() => {
      void this.runPublishCycle();
    }, this.runtimeConfig.outboxPollIntervalMs);

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
          service: 'candidate-service'
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

      const summary = await this.outboxRepository.summarizeBacklog();
      this.metricsRegistry.recordOutboxBacklog({
        failed: summary.failed,
        oldestPendingAgeSeconds: summary.oldestPendingOccurredAt
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - summary.oldestPendingOccurredAt.getTime()) / 1000
              )
            )
          : 0,
        pending: summary.pending,
        processing: summary.processing,
        service: 'candidate-service'
      });

      if (summary.pending > 0 || summary.processing > 0 || summary.failed > 0) {
        this.logger.log(
          `Outbox backlog pending=${summary.pending} processing=${summary.processing} failed=${summary.failed} oldestPending=${summary.oldestPendingOccurredAt?.toISOString() ?? 'n/a'}`
        );
      }
    } finally {
      this.publishRunning = false;
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
        `Failed to publish candidate outbox record ${claimedRecord.id}: ${errorMessage}`
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
}
