import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type IamEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_IAM_URL: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_SECRET: string;
  MAIL_FROM_ADDRESS?: string;
  MAIL_FROM_NAME?: string;
  MAIL_HOST?: string;
  MAIL_PASSWORD?: string;
  MAIL_PORT?: number;
  MAIL_SECURE?: boolean;
  MAIL_USER?: string;
  PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS: number;
  PASSWORD_RESET_MAIL_MAX_RETRIES: number;
  PASSWORD_RESET_SECRET: string;
  PASSWORD_RESET_TOKEN_TTL_MS: number;
  RESET_PASSWORD_URL_BASE?: string;
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
};

export function validateIamEnvironment(
  config: Record<string, unknown>
): IamEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcIamUrl =
    typeof config.GRPC_IAM_URL === 'string' && config.GRPC_IAM_URL.trim().length > 0
      ? config.GRPC_IAM_URL.trim()
      : '0.0.0.0:50051';

  return {
    ...baseEnvironment,
    GRPC_IAM_URL: grpcIamUrl,
    JWT_EXPIRES_IN:
      typeof config.JWT_EXPIRES_IN === 'string' && config.JWT_EXPIRES_IN.trim().length > 0
        ? config.JWT_EXPIRES_IN.trim()
        : '15m',
    JWT_REFRESH_EXPIRES_IN:
      typeof config.JWT_REFRESH_EXPIRES_IN === 'string' &&
      config.JWT_REFRESH_EXPIRES_IN.trim().length > 0
        ? config.JWT_REFRESH_EXPIRES_IN.trim()
        : '7d',
    JWT_SECRET:
      typeof config.JWT_SECRET === 'string' && config.JWT_SECRET.trim().length > 0
        ? config.JWT_SECRET.trim()
        : 'careerhub-dev-secret',
    MAIL_FROM_ADDRESS:
      typeof config.MAIL_FROM_ADDRESS === 'string' &&
      config.MAIL_FROM_ADDRESS.trim().length > 0
        ? config.MAIL_FROM_ADDRESS.trim()
        : undefined,
    MAIL_FROM_NAME:
      typeof config.MAIL_FROM_NAME === 'string' &&
      config.MAIL_FROM_NAME.trim().length > 0
        ? config.MAIL_FROM_NAME.trim()
        : undefined,
    MAIL_HOST:
      typeof config.MAIL_HOST === 'string' && config.MAIL_HOST.trim().length > 0
        ? config.MAIL_HOST.trim()
        : undefined,
    MAIL_PASSWORD:
      typeof config.MAIL_PASSWORD === 'string' &&
      config.MAIL_PASSWORD.trim().length > 0
        ? config.MAIL_PASSWORD.trim()
        : undefined,
    MAIL_PORT:
      typeof config.MAIL_PORT === 'number'
        ? config.MAIL_PORT
        : typeof config.MAIL_PORT === 'string' &&
            Number.isFinite(Number(config.MAIL_PORT))
          ? Number(config.MAIL_PORT)
          : undefined,
    MAIL_SECURE:
      typeof config.MAIL_SECURE === 'boolean'
        ? config.MAIL_SECURE
        : typeof config.MAIL_SECURE === 'string'
          ? config.MAIL_SECURE.trim().toLowerCase() === 'true'
          : undefined,
    MAIL_USER:
      typeof config.MAIL_USER === 'string' && config.MAIL_USER.trim().length > 0
        ? config.MAIL_USER.trim()
        : undefined,
    PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS:
      typeof config.PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS === 'number'
        ? config.PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS
        : typeof config.PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS === 'string' &&
            Number.isFinite(Number(config.PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS))
          ? Number(config.PASSWORD_RESET_MAIL_CLAIM_TIMEOUT_MS)
          : 60_000,
    PASSWORD_RESET_MAIL_MAX_RETRIES:
      typeof config.PASSWORD_RESET_MAIL_MAX_RETRIES === 'number'
        ? config.PASSWORD_RESET_MAIL_MAX_RETRIES
        : typeof config.PASSWORD_RESET_MAIL_MAX_RETRIES === 'string' &&
            Number.isFinite(Number(config.PASSWORD_RESET_MAIL_MAX_RETRIES))
          ? Number(config.PASSWORD_RESET_MAIL_MAX_RETRIES)
          : 3,
    PASSWORD_RESET_SECRET:
      typeof config.PASSWORD_RESET_SECRET === 'string' &&
      config.PASSWORD_RESET_SECRET.trim().length > 0
        ? config.PASSWORD_RESET_SECRET.trim()
        : typeof config.JWT_SECRET === 'string' && config.JWT_SECRET.trim().length > 0
          ? config.JWT_SECRET.trim()
          : 'careerhub-dev-secret',
    PASSWORD_RESET_TOKEN_TTL_MS:
      typeof config.PASSWORD_RESET_TOKEN_TTL_MS === 'number'
        ? config.PASSWORD_RESET_TOKEN_TTL_MS
        : typeof config.PASSWORD_RESET_TOKEN_TTL_MS === 'string' &&
            Number.isFinite(Number(config.PASSWORD_RESET_TOKEN_TTL_MS))
          ? Number(config.PASSWORD_RESET_TOKEN_TTL_MS)
          : 15 * 60 * 1000,
    RESET_PASSWORD_URL_BASE:
      typeof config.RESET_PASSWORD_URL_BASE === 'string' &&
      config.RESET_PASSWORD_URL_BASE.trim().length > 0
        ? config.RESET_PASSWORD_URL_BASE.trim().replace(/\/$/, '')
        : undefined,
    OUTBOX_BACKLOG_INTERVAL_MS:
      typeof config.OUTBOX_BACKLOG_INTERVAL_MS === 'number'
        ? config.OUTBOX_BACKLOG_INTERVAL_MS
        : typeof config.OUTBOX_BACKLOG_INTERVAL_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_BACKLOG_INTERVAL_MS))
          ? Number(config.OUTBOX_BACKLOG_INTERVAL_MS)
          : 30_000,
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
    OUTBOX_FAILED_RETENTION_MS:
      typeof config.OUTBOX_FAILED_RETENTION_MS === 'number'
        ? config.OUTBOX_FAILED_RETENTION_MS
        : typeof config.OUTBOX_FAILED_RETENTION_MS === 'string' &&
            Number.isFinite(Number(config.OUTBOX_FAILED_RETENTION_MS))
          ? Number(config.OUTBOX_FAILED_RETENTION_MS)
          : 30 * 24 * 60 * 60 * 1000,
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
    OUTBOX_PUBLISH_CONCURRENCY:
      typeof config.OUTBOX_PUBLISH_CONCURRENCY === 'number'
        ? config.OUTBOX_PUBLISH_CONCURRENCY
        : typeof config.OUTBOX_PUBLISH_CONCURRENCY === 'string' &&
            Number.isFinite(Number(config.OUTBOX_PUBLISH_CONCURRENCY))
          ? Number(config.OUTBOX_PUBLISH_CONCURRENCY)
          : 5,
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
