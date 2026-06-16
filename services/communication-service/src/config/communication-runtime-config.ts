import type { ConfigService } from '@nestjs/config';
import type { CommunicationEnvironmentVariables } from './communication-env.schema';

export type CommunicationRuntimeConfig = {
  grpcCommunicationUrl: string;
  grpcIamUrl: string;
  mailDeliveryClaimTimeoutMs: number;
  mailInterviewMaxRetries: number;
  mailOfferMaxRetries: number;
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
    grpcIamUrl: configService.getOrThrow('GRPC_IAM_URL'),
    mailDeliveryClaimTimeoutMs: configService.getOrThrow('MAIL_DELIVERY_CLAIM_TIMEOUT_MS'),
    mailInterviewMaxRetries: configService.getOrThrow('MAIL_INTERVIEW_MAX_RETRIES'),
    mailOfferMaxRetries: configService.getOrThrow('MAIL_OFFER_MAX_RETRIES'),
    notificationMaxRetries: configService.getOrThrow('NOTIFICATION_MAX_RETRIES')
  };
}
