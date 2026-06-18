import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type ApplicationEnvironmentVariables = BaseEnvironmentVariables & {
  APP_BASE_URL: string;
  GRPC_APPLICATION_URL: string;
  GRPC_JOB_URL: string;
  OUTBOX_BACKLOG_INTERVAL_MS: number;
  OUTBOX_BATCH_SIZE: number;
  OUTBOX_CLEANUP_BATCH_SIZE: number;
  OUTBOX_CLEANUP_ENABLED: boolean;
  OUTBOX_CLEANUP_INTERVAL_MS: number;
  OUTBOX_FAILED_RETENTION_MS: number;
  OUTBOX_MAX_RETRY_COUNT: number;
  OUTBOX_POLL_INTERVAL_MS: number;
  OUTBOX_PROCESSED_RETENTION_MS: number;
  OUTBOX_PUBLISH_CONCURRENCY: number;
  OUTBOX_PUBLISH_ENABLED: boolean;
  OUTBOX_RETRY_DELAY_MS: number;
  OUTBOX_STALE_PROCESSING_TIMEOUT_MS: number;
  REDIS_DASHBOARD_CACHE_TTL_S: number;
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

export function validateApplicationEnvironment(
  config: Record<string, unknown>
): ApplicationEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcApplicationUrl =
    typeof config.GRPC_APPLICATION_URL === 'string' &&
    config.GRPC_APPLICATION_URL.trim().length > 0
      ? config.GRPC_APPLICATION_URL.trim()
      : '0.0.0.0:50055';
  const grpcJobUrl =
    typeof config.GRPC_JOB_URL === 'string' && config.GRPC_JOB_URL.trim().length > 0
      ? config.GRPC_JOB_URL.trim()
      : '0.0.0.0:50052';
  const appBaseUrl =
    typeof config.APP_BASE_URL === 'string' && config.APP_BASE_URL.trim().length > 0
      ? config.APP_BASE_URL.trim().replace(/\/+$/, '')
      : 'http://localhost:4000';
  const redisUrl =
    typeof config.REDIS_URL === 'string' ? config.REDIS_URL.trim() : '';

  return {
    ...baseEnvironment,
    APP_BASE_URL: appBaseUrl,
    GRPC_APPLICATION_URL: grpcApplicationUrl,
    GRPC_JOB_URL: grpcJobUrl,
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
      30 * 24 * 60 * 60 * 1000
    ),
    OUTBOX_MAX_RETRY_COUNT: readPositiveNumber(config, 'OUTBOX_MAX_RETRY_COUNT', 5),
    OUTBOX_POLL_INTERVAL_MS: readPositiveNumber(config, 'OUTBOX_POLL_INTERVAL_MS', 5_000),
    OUTBOX_PROCESSED_RETENTION_MS: readPositiveNumber(
      config,
      'OUTBOX_PROCESSED_RETENTION_MS',
      7 * 24 * 60 * 60 * 1000
    ),
    OUTBOX_PUBLISH_CONCURRENCY: readPositiveNumber(config, 'OUTBOX_PUBLISH_CONCURRENCY', 5),
    OUTBOX_PUBLISH_ENABLED: readBoolean(config, 'OUTBOX_PUBLISH_ENABLED', true),
    OUTBOX_RETRY_DELAY_MS: readPositiveNumber(config, 'OUTBOX_RETRY_DELAY_MS', 30_000),
    OUTBOX_STALE_PROCESSING_TIMEOUT_MS: readPositiveNumber(
      config,
      'OUTBOX_STALE_PROCESSING_TIMEOUT_MS',
      60_000
    ),
    REDIS_DASHBOARD_CACHE_TTL_S: readPositiveNumber(
      config,
      'REDIS_DASHBOARD_CACHE_TTL_S',
      120
    ),
    REDIS_URL: redisUrl
  };
}