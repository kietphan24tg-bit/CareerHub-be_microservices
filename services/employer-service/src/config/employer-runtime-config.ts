import type { ConfigService } from '@nestjs/config';
import type { EmployerEnvironmentVariables } from './employer-env.schema';

export type EmployerRuntimeConfig = {
  grpcEmployerUrl: string;
};

export function getEmployerRuntimeConfig(
  configService: Pick<
    ConfigService<EmployerEnvironmentVariables, true>,
    'getOrThrow'
  >
): EmployerRuntimeConfig {
  return {
    grpcEmployerUrl: configService.getOrThrow('GRPC_EMPLOYER_URL')
  };
}
