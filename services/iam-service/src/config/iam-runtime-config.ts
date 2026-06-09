import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './iam-env.schema';

export type IamRuntimeConfig = {
  grpcIamUrl: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtSecret: string;
  passwordResetTokenTtlMs: number;
  outboxBatchSize: number;
  outboxCleanupBatchSize: number;
  outboxCleanupEnabled: boolean;
  outboxCleanupIntervalMs: number;
  outboxMaxRetryCount: number;
  outboxPollIntervalMs: number;
  outboxProcessedRetentionMs: number;
  outboxPublishEnabled: boolean;
  outboxRetryDelayMs: number;
  outboxStaleProcessingTimeoutMs: number;
};

export function getIamRuntimeConfig(
  configService: Pick<
    ConfigService<IamEnvironmentVariables, true>,
    'getOrThrow'
  >
): IamRuntimeConfig {
  return {
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    jwtExpiresIn: configService.getOrThrow('JWT_EXPIRES_IN'),
    jwtRefreshExpiresIn: configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
    jwtSecret: configService.getOrThrow('JWT_SECRET'),
    passwordResetTokenTtlMs: configService.getOrThrow(
      'PASSWORD_RESET_TOKEN_TTL_MS'
    ),
    outboxBatchSize: configService.getOrThrow('OUTBOX_BATCH_SIZE'),
    outboxCleanupBatchSize: configService.getOrThrow('OUTBOX_CLEANUP_BATCH_SIZE'),
    outboxCleanupEnabled: configService.getOrThrow('OUTBOX_CLEANUP_ENABLED'),
    outboxCleanupIntervalMs: configService.getOrThrow('OUTBOX_CLEANUP_INTERVAL_MS'),
    outboxMaxRetryCount: configService.getOrThrow('OUTBOX_MAX_RETRY_COUNT'),
    outboxPollIntervalMs: configService.getOrThrow('OUTBOX_POLL_INTERVAL_MS'),
    outboxProcessedRetentionMs: configService.getOrThrow(
      'OUTBOX_PROCESSED_RETENTION_MS'
    ),
    outboxPublishEnabled: configService.getOrThrow('OUTBOX_PUBLISH_ENABLED'),
    outboxRetryDelayMs: configService.getOrThrow('OUTBOX_RETRY_DELAY_MS'),
    outboxStaleProcessingTimeoutMs: configService.getOrThrow(
      'OUTBOX_STALE_PROCESSING_TIMEOUT_MS'
    )
  };
}
