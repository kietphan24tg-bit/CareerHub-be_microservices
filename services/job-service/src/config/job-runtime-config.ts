import type { ConfigService } from '@nestjs/config';
import type { JobEnvironmentVariables } from './job-env.schema';

export type JobRuntimeConfig = {
  grpcJobUrl: string;
};

export function getJobRuntimeConfig(
  configService: Pick<
    ConfigService<JobEnvironmentVariables, true>,
    'getOrThrow'
  >
): JobRuntimeConfig {
  return {
    grpcJobUrl: configService.getOrThrow('GRPC_JOB_URL')
  };
}
