import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type CommunicationEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_COMMUNICATION_URL: string;
  NOTIFICATION_MAX_RETRIES: number;
};

export function validateCommunicationEnvironment(
  config: Record<string, unknown>
): CommunicationEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcCommunicationUrl =
    typeof config.GRPC_COMMUNICATION_URL === 'string' &&
    config.GRPC_COMMUNICATION_URL.trim().length > 0
      ? config.GRPC_COMMUNICATION_URL.trim()
      : '0.0.0.0:50056';

  return {
    ...baseEnvironment,
    GRPC_COMMUNICATION_URL: grpcCommunicationUrl,
    NOTIFICATION_MAX_RETRIES:
      typeof config.NOTIFICATION_MAX_RETRIES === 'number'
        ? config.NOTIFICATION_MAX_RETRIES
        : typeof config.NOTIFICATION_MAX_RETRIES === 'string' &&
            Number.isFinite(Number(config.NOTIFICATION_MAX_RETRIES))
          ? Number(config.NOTIFICATION_MAX_RETRIES)
          : 3
  };
}
