import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type CommunicationEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_COMMUNICATION_URL: string;
  GRPC_IAM_URL: string;
  MAIL_DELIVERY_CLAIM_TIMEOUT_MS: number;
  MAIL_FROM_ADDRESS?: string;
  MAIL_FROM_NAME?: string;
  MAIL_HOST?: string;
  MAIL_INTERVIEW_MAX_RETRIES: number;
  MAIL_OFFER_MAX_RETRIES: number;
  MAIL_PASSWORD?: string;
  MAIL_PORT?: number;
  MAIL_SECURE?: boolean;
  MAIL_USER?: string;
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
  const grpcIamUrl =
    typeof config.GRPC_IAM_URL === 'string' && config.GRPC_IAM_URL.trim().length > 0
      ? config.GRPC_IAM_URL.trim()
      : '0.0.0.0:50051';

  return {
    ...baseEnvironment,
    GRPC_COMMUNICATION_URL: grpcCommunicationUrl,
    GRPC_IAM_URL: grpcIamUrl,
    MAIL_FROM_ADDRESS:
      typeof config.MAIL_FROM_ADDRESS === 'string' ? config.MAIL_FROM_ADDRESS : undefined,
    MAIL_FROM_NAME:
      typeof config.MAIL_FROM_NAME === 'string' ? config.MAIL_FROM_NAME : undefined,
    MAIL_HOST: typeof config.MAIL_HOST === 'string' ? config.MAIL_HOST : undefined,
    MAIL_DELIVERY_CLAIM_TIMEOUT_MS:
      typeof config.MAIL_DELIVERY_CLAIM_TIMEOUT_MS === 'number'
        ? config.MAIL_DELIVERY_CLAIM_TIMEOUT_MS
        : typeof config.MAIL_DELIVERY_CLAIM_TIMEOUT_MS === 'string' &&
            Number.isFinite(Number(config.MAIL_DELIVERY_CLAIM_TIMEOUT_MS))
          ? Number(config.MAIL_DELIVERY_CLAIM_TIMEOUT_MS)
          : 60_000,
    MAIL_INTERVIEW_MAX_RETRIES:
      typeof config.MAIL_INTERVIEW_MAX_RETRIES === 'number'
        ? config.MAIL_INTERVIEW_MAX_RETRIES
        : typeof config.MAIL_INTERVIEW_MAX_RETRIES === 'string' &&
            Number.isFinite(Number(config.MAIL_INTERVIEW_MAX_RETRIES))
          ? Number(config.MAIL_INTERVIEW_MAX_RETRIES)
          : 3,
    MAIL_OFFER_MAX_RETRIES:
      typeof config.MAIL_OFFER_MAX_RETRIES === 'number'
        ? config.MAIL_OFFER_MAX_RETRIES
        : typeof config.MAIL_OFFER_MAX_RETRIES === 'string' &&
            Number.isFinite(Number(config.MAIL_OFFER_MAX_RETRIES))
          ? Number(config.MAIL_OFFER_MAX_RETRIES)
          : 3,
    MAIL_PASSWORD:
      typeof config.MAIL_PASSWORD === 'string' ? config.MAIL_PASSWORD : undefined,
    MAIL_PORT:
      typeof config.MAIL_PORT === 'number'
        ? config.MAIL_PORT
        : typeof config.MAIL_PORT === 'string' && Number.isFinite(Number(config.MAIL_PORT))
          ? Number(config.MAIL_PORT)
          : undefined,
    MAIL_SECURE:
      typeof config.MAIL_SECURE === 'boolean'
        ? config.MAIL_SECURE
        : typeof config.MAIL_SECURE === 'string'
          ? config.MAIL_SECURE.trim().toLowerCase() === 'true'
          : undefined,
    MAIL_USER: typeof config.MAIL_USER === 'string' ? config.MAIL_USER : undefined,
    NOTIFICATION_MAX_RETRIES:
      typeof config.NOTIFICATION_MAX_RETRIES === 'number'
        ? config.NOTIFICATION_MAX_RETRIES
        : typeof config.NOTIFICATION_MAX_RETRIES === 'string' &&
            Number.isFinite(Number(config.NOTIFICATION_MAX_RETRIES))
          ? Number(config.NOTIFICATION_MAX_RETRIES)
          : 3
  };
}
