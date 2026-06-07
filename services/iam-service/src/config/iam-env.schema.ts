import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type IamEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_IAM_URL: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_SECRET: string;
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
        : 'careerhub-dev-secret'
  };
}
