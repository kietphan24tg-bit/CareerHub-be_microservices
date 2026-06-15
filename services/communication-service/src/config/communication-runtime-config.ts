import type { ConfigService } from '@nestjs/config';
import type { CommunicationEnvironmentVariables } from './communication-env.schema';

export type CommunicationRuntimeConfig = {
  grpcCommunicationUrl: string;
  notificationMaxRetries: number;
};

export function getCommunicationRuntimeConfig(
  configService: Pick<
    ConfigService<CommunicationEnvironmentVariables, true>,
    'getOrThrow'
  >
): CommunicationRuntimeConfig {
  return {
    grpcCommunicationUrl: configService.getOrThrow('GRPC_COMMUNICATION_URL'),
    notificationMaxRetries: configService.getOrThrow('NOTIFICATION_MAX_RETRIES')
  };
}
