import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type ApplicationEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_APPLICATION_URL: string;
};

export function validateApplicationEnvironment(
  config: Record<string, unknown>
): ApplicationEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcApplicationUrl =
    typeof config.GRPC_APPLICATION_URL === 'string' &&
    config.GRPC_APPLICATION_URL.trim().length > 0
      ? config.GRPC_APPLICATION_URL.trim()
      : '0.0.0.0:50055';

  return {
    ...baseEnvironment,
    GRPC_APPLICATION_URL: grpcApplicationUrl
  };
}
