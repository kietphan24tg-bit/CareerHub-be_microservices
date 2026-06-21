import type { ConfigService } from '@nestjs/config';
import type { JobEnvironmentVariables } from './job-env.schema';

export type JobRuntimeConfig = {
  grpcJobUrl: string;
  meilisearchApiKey: string;
  meilisearchHost: string;
  outboxBacklogIntervalMs: number;
  outboxBatchSize: number;
  outboxCleanupBatchSize: number;
  outboxCleanupEnabled: boolean;
  outboxCleanupIntervalMs: number;
  outboxFailedRetentionMs: number;
  outboxMaxRetryCount: number;
  outboxPollIntervalMs: number;
  outboxProcessedRetentionMs: number;
  outboxPublishConcurrency: number;
  outboxPublishEnabled: boolean;
  outboxRetryDelayMs: number;
  outboxStaleProcessingTimeoutMs: number;
  redisSearchCacheTtlS: number;
  redisSlugCacheTtlS: number;
  redisUrl: string;
};

export function getJobRuntimeConfig(
  configService: Pick<
    ConfigService<JobEnvironmentVariables, true>,
    'getOrThrow'
  >
): JobRuntimeConfig {
  return {
    grpcJobUrl: configService.getOrThrow('GRPC_JOB_URL'),
    meilisearchApiKey: configService.getOrThrow('MEILISEARCH_API_KEY'),
    meilisearchHost: configService.getOrThrow('MEILISEARCH_HOST'),
    outboxBacklogIntervalMs: configService.getOrThrow('OUTBOX_BACKLOG_INTERVAL_MS'),
    outboxBatchSize: configService.getOrThrow('OUTBOX_BATCH_SIZE'),
    outboxCleanupBatchSize: configService.getOrThrow('OUTBOX_CLEANUP_BATCH_SIZE'),
    outboxCleanupEnabled: configService.getOrThrow('OUTBOX_CLEANUP_ENABLED'),
    outboxCleanupIntervalMs: configService.getOrThrow('OUTBOX_CLEANUP_INTERVAL_MS'),
    outboxFailedRetentionMs: configService.getOrThrow('OUTBOX_FAILED_RETENTION_MS'),
    outboxMaxRetryCount: configService.getOrThrow('OUTBOX_MAX_RETRY_COUNT'),
    outboxPollIntervalMs: configService.getOrThrow('OUTBOX_POLL_INTERVAL_MS'),
    outboxProcessedRetentionMs: configService.getOrThrow('OUTBOX_PROCESSED_RETENTION_MS'),
    outboxPublishConcurrency: configService.getOrThrow('OUTBOX_PUBLISH_CONCURRENCY'),
    outboxPublishEnabled: configService.getOrThrow('OUTBOX_PUBLISH_ENABLED'),
    outboxRetryDelayMs: configService.getOrThrow('OUTBOX_RETRY_DELAY_MS'),
    outboxStaleProcessingTimeoutMs: configService.getOrThrow(
      'OUTBOX_STALE_PROCESSING_TIMEOUT_MS'
    ),
    redisSearchCacheTtlS: configService.getOrThrow('REDIS_SEARCH_CACHE_TTL_S'),
    redisSlugCacheTtlS: configService.getOrThrow('REDIS_SLUG_CACHE_TTL_S'),
    redisUrl: configService.getOrThrow('REDIS_URL')
  };
}
