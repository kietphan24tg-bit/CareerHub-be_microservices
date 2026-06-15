import {
  validateEnvironment,
  type EnvironmentVariables as BaseEnvironmentVariables
} from '@careerhub/infrastructure';

export type CandidateEnvironmentVariables = BaseEnvironmentVariables & {
  GRPC_CANDIDATE_URL: string;
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
    GRPC_CANDIDATE_URL: grpcCandidateUrl
  };
}
