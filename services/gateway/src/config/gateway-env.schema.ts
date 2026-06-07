import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type GatewayEnvironmentVariables = BaseEnvironmentVariables & {
  AUTH_REFRESH_COOKIE_DOMAIN?: string;
  AUTH_REFRESH_COOKIE_NAME: string;
  AUTH_REFRESH_COOKIE_SECURE: boolean;
  GRPC_CANDIDATE_URL: string;
  GRPC_EMPLOYER_URL: string;
  GRPC_IAM_URL: string;
  JWT_REFRESH_EXPIRES_IN: string;
};

export function validateGatewayEnvironment(
  config: Record<string, unknown>
): GatewayEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcIamUrl =
    typeof config.GRPC_IAM_URL === 'string' &&
    config.GRPC_IAM_URL.trim().length > 0
      ? config.GRPC_IAM_URL.trim()
      : '0.0.0.0:50051';
  const grpcCandidateUrl =
    typeof config.GRPC_CANDIDATE_URL === 'string' &&
    config.GRPC_CANDIDATE_URL.trim().length > 0
      ? config.GRPC_CANDIDATE_URL.trim()
      : '127.0.0.1:50052';
  const grpcEmployerUrl =
    typeof config.GRPC_EMPLOYER_URL === 'string' &&
    config.GRPC_EMPLOYER_URL.trim().length > 0
      ? config.GRPC_EMPLOYER_URL.trim()
      : '127.0.0.1:50053';

  return {
    ...baseEnvironment,
    AUTH_REFRESH_COOKIE_DOMAIN:
      typeof config.AUTH_REFRESH_COOKIE_DOMAIN === 'string' &&
      config.AUTH_REFRESH_COOKIE_DOMAIN.trim().length > 0
        ? config.AUTH_REFRESH_COOKIE_DOMAIN.trim()
        : undefined,
    AUTH_REFRESH_COOKIE_NAME:
      typeof config.AUTH_REFRESH_COOKIE_NAME === 'string' &&
      config.AUTH_REFRESH_COOKIE_NAME.trim().length > 0
        ? config.AUTH_REFRESH_COOKIE_NAME.trim()
        : 'refresh_token',
    AUTH_REFRESH_COOKIE_SECURE:
      typeof config.AUTH_REFRESH_COOKIE_SECURE === 'boolean'
        ? config.AUTH_REFRESH_COOKIE_SECURE
        : typeof config.AUTH_REFRESH_COOKIE_SECURE === 'string'
          ? ['1', 'true', 'yes', 'on'].includes(
              config.AUTH_REFRESH_COOKIE_SECURE.trim().toLowerCase()
            )
          : false,
    GRPC_CANDIDATE_URL: grpcCandidateUrl,
    GRPC_EMPLOYER_URL: grpcEmployerUrl,
    GRPC_IAM_URL: grpcIamUrl,
    JWT_REFRESH_EXPIRES_IN:
      typeof config.JWT_REFRESH_EXPIRES_IN === 'string' &&
      config.JWT_REFRESH_EXPIRES_IN.trim().length > 0
        ? config.JWT_REFRESH_EXPIRES_IN.trim()
        : '7d'
  };
}
