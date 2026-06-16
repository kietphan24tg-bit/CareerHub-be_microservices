import type { ConfigService } from '@nestjs/config';
import type { CommunicationEnvironmentVariables } from './communication-env.schema';

export type CommunicationMailConfig = {
  fromAddress: string | null;
  fromName: string;
  host: string | null;
  interviewMaxRetries: number;
  offerMaxRetries: number;
  password: string | null;
  port: number | null;
  secure: boolean;
  user: string | null;
};

function readOptionalString(
  configService: Pick<ConfigService<CommunicationEnvironmentVariables, true>, 'get'>,
  key: keyof CommunicationEnvironmentVariables
): string | null {
  const value = configService.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalNumber(
  configService: Pick<ConfigService<CommunicationEnvironmentVariables, true>, 'get'>,
  key: keyof CommunicationEnvironmentVariables
): number | null {
  const value = configService.get(key);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

function readPositiveNumber(
  configService: Pick<ConfigService<CommunicationEnvironmentVariables, true>, 'get'>,
  key: keyof CommunicationEnvironmentVariables,
  fallback: number
): number {
  const value = readOptionalNumber(configService, key);
  return value && value > 0 ? value : fallback;
}

export function getCommunicationMailConfig(
  configService: Pick<ConfigService<CommunicationEnvironmentVariables, true>, 'get'>
): CommunicationMailConfig {
  return {
    fromAddress: readOptionalString(configService, 'MAIL_FROM_ADDRESS'),
    fromName: readOptionalString(configService, 'MAIL_FROM_NAME') ?? 'CareerHub',
    host: readOptionalString(configService, 'MAIL_HOST'),
    interviewMaxRetries: readPositiveNumber(configService, 'MAIL_INTERVIEW_MAX_RETRIES', 3),
    offerMaxRetries: readPositiveNumber(configService, 'MAIL_OFFER_MAX_RETRIES', 3),
    password: readOptionalString(configService, 'MAIL_PASSWORD'),
    port: readOptionalNumber(configService, 'MAIL_PORT'),
    secure: configService.get('MAIL_SECURE') === true,
    user: readOptionalString(configService, 'MAIL_USER')
  };
}

export function isCommunicationMailConfigured(config: CommunicationMailConfig): boolean {
  return !!(
    config.host &&
    config.port &&
    config.user &&
    config.password &&
    config.fromAddress
  );
}
