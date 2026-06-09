import type { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './iam-env.schema';

export type IamMailConfig = {
  fromAddress: string | null;
  fromName: string;
  host: string | null;
  password: string | null;
  port: number | null;
  resetPasswordUrlBase: string | null;
  secure: boolean;
  user: string | null;
};

function readOptionalString(
  configService: Pick<ConfigService<IamEnvironmentVariables, true>, 'get'>,
  key: keyof IamEnvironmentVariables
): string | null {
  const value = configService.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readOptionalNumber(
  configService: Pick<ConfigService<IamEnvironmentVariables, true>, 'get'>,
  key: keyof IamEnvironmentVariables
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

export function getIamMailConfig(
  configService: Pick<ConfigService<IamEnvironmentVariables, true>, 'get'>
): IamMailConfig {
  return {
    fromAddress: readOptionalString(configService, 'MAIL_FROM_ADDRESS'),
    fromName: readOptionalString(configService, 'MAIL_FROM_NAME') ?? 'CareerHub',
    host: readOptionalString(configService, 'MAIL_HOST'),
    password: readOptionalString(configService, 'MAIL_PASSWORD'),
    port: readOptionalNumber(configService, 'MAIL_PORT'),
    resetPasswordUrlBase: readOptionalString(configService, 'RESET_PASSWORD_URL_BASE'),
    secure: configService.get('MAIL_SECURE') === true,
    user: readOptionalString(configService, 'MAIL_USER')
  };
}

export function isIamMailConfigured(config: IamMailConfig): boolean {
  return !!(
    config.host &&
    config.port &&
    config.user &&
    config.password &&
    config.fromAddress
  );
}
