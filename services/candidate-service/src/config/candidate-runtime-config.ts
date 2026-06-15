import type { ConfigService } from '@nestjs/config';
import type { CandidateEnvironmentVariables } from './candidate-env.schema';

export type CandidateRuntimeConfig = {
  grpcCandidateUrl: string;
};

export function getCandidateRuntimeConfig(
  configService: Pick<
    ConfigService<CandidateEnvironmentVariables, true>,
    'getOrThrow'
  >
): CandidateRuntimeConfig {
  return {
    grpcCandidateUrl: configService.getOrThrow('GRPC_CANDIDATE_URL')
  };
}
