import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type CandidateEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_CANDIDATE_URL: string;
  OUTBOX_BATCH_SIZE: number;
  OUTBOX_CLEANUP_BATCH_SIZE: number;
  OUTBOX_CLEANUP_ENABLED: boolean;
  OUTBOX_CLEANUP_INTERVAL_MS: number;
  OUTBOX_MAX_RETRY_COUNT: number;
  OUTBOX_POLL_INTERVAL_MS: number;
  OUTBOX_PROCESSED_RETENTION_MS: number;
  OUTBOX_PUBLISH_ENABLED: boolean;
  OUTBOX_RETRY_DELAY_MS: number;
  OUTBOX_STALE_PROCESSING_TIMEOUT_MS: number;
};

export function validateCandidateEnvironment(
  config: Record<string, unknown>
): CandidateEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcCandidateUrl =
    typeof config.GRPC_CANDIDATE_URL === 'string' &&
    config.GRPC_CANDIDATE_URL.trim().length > 0
      ? config.GRPC_CANDIDATE_URL.trim()
      : '0.0.0.0:50052';

  return {
    ...baseEnvironment,
    GRPC_CANDIDATE_URL: grpcCandidateUrl,
    OUTBOX_BATCH_SIZE:
      typeof config.OUTBOX_BATCH_SIZE === 'number'
        ? config.OUTBOX_BATCH_SIZE
        : typeof config.OUTBOX_BATCH_SIZE === 'string' &&
            Number.isFinite(Number(config.OUTBOX_BATCH_SIZE))
          ? Number(config.OUTBOX_BATCH_SIZE)
          : 20,
    OUTBOX_CLEANUP_BATCH_SIZE:
      typeof config.OUTBOX_CLEANUP_BATCH_SIZE === 'number'
        ? config.OUTBOX_CLEANUP_BATCH_SIZE
        : typeof config.OUTBOX_CLEANUP_BATCH_SIZE === 'string' &&
            Number.isFinite(Number(config.OUTBOX_CLEANUP_BATCH_SIZE))
          ? Number(config.OUTBOX_CLEANUP_BATCH_SIZE)
          : 100,
    OUTBOX_CLEANUP_ENABLED:
      typeof config.OUTBOX_CLEANUP_ENABLED === 'boolean'
        ? config.OUTBOX_CLEANUP_ENABLED
        : typeof config.OUTBOX_CLEANUP_ENABLED === 'string'
          ? config.OUTBOX_CLEANUP_ENABLED.trim().toLowerCase() !== 'false'
          : true,
    OUTBOX_CLEANUP_INTERVAL_MS:
      typeof config.OUTBOX_CLEANUP_INTERVAL_MS === 'number'
        ? config.OUTBOX_CLEANUP_INTERVAL_MS
        : typeof config.OUTBOX_CLEANUP_INTERVAL_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_CLEANUP_INTERVAL_MS))
          ? Number(config.OUTBOX_CLEANUP_INTERVAL_MS)
          : 60_000,
    OUTBOX_MAX_RETRY_COUNT:
      typeof config.OUTBOX_MAX_RETRY_COUNT === 'number'
        ? config.OUTBOX_MAX_RETRY_COUNT
        : typeof config.OUTBOX_MAX_RETRY_COUNT === 'string' &&
            Number.isFinite(Number(config.OUTBOX_MAX_RETRY_COUNT))
          ? Number(config.OUTBOX_MAX_RETRY_COUNT)
          : 5,
    OUTBOX_POLL_INTERVAL_MS:
      typeof config.OUTBOX_POLL_INTERVAL_MS === 'number'
        ? config.OUTBOX_POLL_INTERVAL_MS
        : typeof config.OUTBOX_POLL_INTERVAL_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_POLL_INTERVAL_MS))
          ? Number(config.OUTBOX_POLL_INTERVAL_MS)
          : 5_000,
    OUTBOX_PROCESSED_RETENTION_MS:
      typeof config.OUTBOX_PROCESSED_RETENTION_MS === 'number'
        ? config.OUTBOX_PROCESSED_RETENTION_MS
        : typeof config.OUTBOX_PROCESSED_RETENTION_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_PROCESSED_RETENTION_MS))
          ? Number(config.OUTBOX_PROCESSED_RETENTION_MS)
          : 7 * 24 * 60 * 60 * 1000,
    OUTBOX_PUBLISH_ENABLED:
      typeof config.OUTBOX_PUBLISH_ENABLED === 'boolean'
        ? config.OUTBOX_PUBLISH_ENABLED
        : typeof config.OUTBOX_PUBLISH_ENABLED === 'string'
          ? config.OUTBOX_PUBLISH_ENABLED.trim().toLowerCase() !== 'false'
          : true,
    OUTBOX_RETRY_DELAY_MS:
      typeof config.OUTBOX_RETRY_DELAY_MS === 'number'
        ? config.OUTBOX_RETRY_DELAY_MS
        : typeof config.OUTBOX_RETRY_DELAY_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_RETRY_DELAY_MS))
          ? Number(config.OUTBOX_RETRY_DELAY_MS)
          : 30_000,
    OUTBOX_STALE_PROCESSING_TIMEOUT_MS:
      typeof config.OUTBOX_STALE_PROCESSING_TIMEOUT_MS === 'number'
        ? config.OUTBOX_STALE_PROCESSING_TIMEOUT_MS
        : typeof config.OUTBOX_STALE_PROCESSING_TIMEOUT_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_STALE_PROCESSING_TIMEOUT_MS))
          ? Number(config.OUTBOX_STALE_PROCESSING_TIMEOUT_MS)
          : 60_000
  };
}
