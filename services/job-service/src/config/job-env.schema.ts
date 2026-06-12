import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type JobEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_JOB_URL: string;
};

export function validateJobEnvironment(
  config: Record<string, unknown>
): JobEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcJobUrl =
    typeof config.GRPC_JOB_URL === 'string' &&
    config.GRPC_JOB_URL.trim().length > 0
      ? config.GRPC_JOB_URL.trim()
      : '0.0.0.0:50054';

  return {
    ...baseEnvironment,
    GRPC_JOB_URL: grpcJobUrl
  };
}
