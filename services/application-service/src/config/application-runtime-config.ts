import type { ConfigService } from '@nestjs/config';
import type { ApplicationEnvironmentVariables } from './application-env.schema';

export type ApplicationRuntimeConfig = {
  grpcApplicationUrl: string;
  outboxBacklogIntervalMs: number;
  outboxBatchSize: number;
  outboxCleanupBatchSize: number;
  outboxCleanupEnabled: boolean;
  outboxCleanupIntervalMs: number;
  outboxFailedRetentionMs: number;
  outboxMaxRetryCount: number;
  outboxPollIntervalMs: number;
  outboxProcessedRetentionMs: number;
  outboxPublishEnabled: boolean;
  outboxRetryDelayMs: number;
  outboxStaleProcessingTimeoutMs: number;
  redisDashboardCacheTtlS: number;
  redisUrl: string;
};

export function getApplicationRuntimeConfig(
  configService: Pick<
    ConfigService<ApplicationEnvironmentVariables, true>,
    'getOrThrow'
  >
): ApplicationRuntimeConfig {
  return {
    grpcApplicationUrl: configService.getOrThrow('GRPC_APPLICATION_URL'),
    outboxBacklogIntervalMs: configService.getOrThrow('OUTBOX_BACKLOG_INTERVAL_MS'),
    outboxBatchSize: configService.getOrThrow('OUTBOX_BATCH_SIZE'),
    outboxCleanupBatchSize: configService.getOrThrow('OUTBOX_CLEANUP_BATCH_SIZE'),
    outboxCleanupEnabled: configService.getOrThrow('OUTBOX_CLEANUP_ENABLED'),
    outboxCleanupIntervalMs: configService.getOrThrow('OUTBOX_CLEANUP_INTERVAL_MS'),
    outboxFailedRetentionMs: configService.getOrThrow('OUTBOX_FAILED_RETENTION_MS'),
    outboxMaxRetryCount: configService.getOrThrow('OUTBOX_MAX_RETRY_COUNT'),
    outboxPollIntervalMs: configService.getOrThrow('OUTBOX_POLL_INTERVAL_MS'),
    outboxProcessedRetentionMs: configService.getOrThrow('OUTBOX_PROCESSED_RETENTION_MS'),
    outboxPublishEnabled: configService.getOrThrow('OUTBOX_PUBLISH_ENABLED'),
    outboxRetryDelayMs: configService.getOrThrow('OUTBOX_RETRY_DELAY_MS'),
    outboxStaleProcessingTimeoutMs: configService.getOrThrow(
      'OUTBOX_STALE_PROCESSING_TIMEOUT_MS'
    ),
    redisDashboardCacheTtlS: configService.getOrThrow('REDIS_DASHBOARD_CACHE_TTL_S'),
    redisUrl: configService.getOrThrow('REDIS_URL')
  };
}
