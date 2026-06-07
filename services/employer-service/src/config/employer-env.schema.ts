import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type EmployerEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_EMPLOYER_URL: string;
};

export function validateEmployerEnvironment(
  config: Record<string, unknown>
): EmployerEnvironmentVariables {
  const baseEnvironment = validateEnvironment(config);
  const grpcEmployerUrl =
    typeof config.GRPC_EMPLOYER_URL === 'string' &&
    config.GRPC_EMPLOYER_URL.trim().length > 0
      ? config.GRPC_EMPLOYER_URL.trim()
      : '0.0.0.0:50053';

  return {
    ...baseEnvironment,
    GRPC_EMPLOYER_URL: grpcEmployerUrl
  };
}
