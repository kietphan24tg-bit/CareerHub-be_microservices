import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type JobEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_JOB_URL: string;
  MEILISEARCH_API_KEY: string;
  MEILISEARCH_HOST: string;
  OUTBOX_BACKLOG_INTERVAL_MS: number;
  OUTBOX_BATCH_SIZE: number;
  OUTBOX_CLEANUP_BATCH_SIZE: number;
  OUTBOX_CLEANUP_ENABLED: boolean;
  OUTBOX_CLEANUP_INTERVAL_MS: number;
  OUTBOX_FAILED_RETENTION_MS: number;
  OUTBOX_MAX_RETRY_COUNT: number;
  OUTBOX_POLL_INTERVAL_MS: number;
  OUTBOX_PUBLISH_CONCURRENCY: number;
  OUTBOX_PROCESSED_RETENTION_MS: number;
  OUTBOX_PUBLISH_ENABLED: boolean;
  OUTBOX_RETRY_DELAY_MS: number;
  OUTBOX_STALE_PROCESSING_TIMEOUT_MS: number;
  REDIS_SEARCH_CACHE_TTL_S: number;
  REDIS_SLUG_CACHE_TTL_S: number;
  REDIS_URL: string;
};

function readPositiveNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const value = config[key];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return fallback;
}

function readBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean {
  const value = config[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() !== 'false';
  }

  return fallback;
}

export function validateJobEnvironment(
  config: Record<string, unknown>
): JobEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcJobUrl =
    typeof config.GRPC_JOB_URL === 'string' &&
    config.GRPC_JOB_URL.trim().length > 0
      ? config.GRPC_JOB_URL.trim()
      : '0.0.0.0:50054';

  const meilisearchHost =
    typeof config.MEILISEARCH_HOST === 'string' ? config.MEILISEARCH_HOST.trim() : '';
  const meilisearchApiKey =
    typeof config.MEILISEARCH_API_KEY === 'string' ? config.MEILISEARCH_API_KEY.trim() : '';
  const redisUrl =
    typeof config.REDIS_URL === 'string' ? config.REDIS_URL.trim() : '';

  return {
    ...baseEnvironment,
    GRPC_JOB_URL: grpcJobUrl,
    MEILISEARCH_API_KEY: meilisearchApiKey,
    MEILISEARCH_HOST: meilisearchHost,
    OUTBOX_BACKLOG_INTERVAL_MS: readPositiveNumber(
      config,
      'OUTBOX_BACKLOG_INTERVAL_MS',
      30_000
    ),
    OUTBOX_BATCH_SIZE: readPositiveNumber(config, 'OUTBOX_BATCH_SIZE', 20),
    OUTBOX_CLEANUP_BATCH_SIZE: readPositiveNumber(
      config,
      'OUTBOX_CLEANUP_BATCH_SIZE',
      100
    ),
    OUTBOX_CLEANUP_ENABLED: readBoolean(config, 'OUTBOX_CLEANUP_ENABLED', true),
    OUTBOX_CLEANUP_INTERVAL_MS: readPositiveNumber(
      config,
      'OUTBOX_CLEANUP_INTERVAL_MS',
      60_000
    ),
    OUTBOX_FAILED_RETENTION_MS: readPositiveNumber(
      config,
      'OUTBOX_FAILED_RETENTION_MS',
      7 * 24 * 60 * 60 * 1000
    ),
    OUTBOX_MAX_RETRY_COUNT: readPositiveNumber(config, 'OUTBOX_MAX_RETRY_COUNT', 5),
    OUTBOX_POLL_INTERVAL_MS: readPositiveNumber(config, 'OUTBOX_POLL_INTERVAL_MS', 5_000),
    OUTBOX_PUBLISH_CONCURRENCY: readPositiveNumber(
      config,
      'OUTBOX_PUBLISH_CONCURRENCY',
      5
    ),
    OUTBOX_PROCESSED_RETENTION_MS: readPositiveNumber(
      config,
      'OUTBOX_PROCESSED_RETENTION_MS',
      7 * 24 * 60 * 60 * 1000
    ),
    OUTBOX_PUBLISH_ENABLED: readBoolean(config, 'OUTBOX_PUBLISH_ENABLED', true),
    OUTBOX_RETRY_DELAY_MS: readPositiveNumber(config, 'OUTBOX_RETRY_DELAY_MS', 30_000),
    OUTBOX_STALE_PROCESSING_TIMEOUT_MS: readPositiveNumber(
      config,
      'OUTBOX_STALE_PROCESSING_TIMEOUT_MS',
      60_000
    ),
    REDIS_SEARCH_CACHE_TTL_S: readPositiveNumber(
      config,
      'REDIS_SEARCH_CACHE_TTL_S',
      30
    ),
    REDIS_SLUG_CACHE_TTL_S: readPositiveNumber(config, 'REDIS_SLUG_CACHE_TTL_S', 300),
    REDIS_URL: redisUrl
  };
}
