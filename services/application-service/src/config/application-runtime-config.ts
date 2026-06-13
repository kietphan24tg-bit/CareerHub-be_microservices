import type { ConfigService } from '@nestjs/config';
import type { ApplicationEnvironmentVariables } from './application-env.schema';

export type ApplicationRuntimeConfig = {
  grpcApplicationUrl: string;
};

export function getApplicationRuntimeConfig(
  configService: Pick<
    ConfigService<ApplicationEnvironmentVariables, true>,
    'getOrThrow'
  >
): ApplicationRuntimeConfig {
  return {
    grpcApplicationUrl: configService.getOrThrow('GRPC_APPLICATION_URL')
  };
}
