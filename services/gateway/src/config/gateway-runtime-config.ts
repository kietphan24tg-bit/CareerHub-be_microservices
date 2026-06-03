import type { ConfigService } from '@nestjs/config';
import type { GatewayEnvironmentVariables } from './gateway-env.schema';

export type GatewayRuntimeConfig = {
  grpcIamUrl: string;
  rabbitMqExchange: string;
  rabbitMqPrefetch: number;
};

export function getGatewayRuntimeConfig(
  configService: Pick<
    ConfigService<GatewayEnvironmentVariables, true>,
    'getOrThrow'
  >
): GatewayRuntimeConfig {
  return {
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    rabbitMqExchange: configService.getOrThrow('RABBITMQ_EXCHANGE'),
    rabbitMqPrefetch: configService.getOrThrow('RABBITMQ_PREFETCH')
  };
}
