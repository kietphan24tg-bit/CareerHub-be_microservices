import type { ConfigService } from '@nestjs/config';
import type { GatewayEnvironmentVariables } from './gateway-env.schema';

export type GatewayRuntimeConfig = {
  grpcIamUrl: string;
};

export function getGatewayRuntimeConfig(
  configService: Pick<
    ConfigService<GatewayEnvironmentVariables, true>,
    'getOrThrow'
  >
): GatewayRuntimeConfig {
  return {
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL')
  };
}
