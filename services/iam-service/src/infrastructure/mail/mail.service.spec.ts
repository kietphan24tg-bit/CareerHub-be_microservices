import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from '../../config';
import { MailService } from './mail.service';

function createConfig(
  values: Partial<IamEnvironmentVariables>
): ConfigService<IamEnvironmentVariables, true> {
  return {
    get(key: keyof IamEnvironmentVariables) {
      return values[key];
    }
  } as ConfigService<IamEnvironmentVariables, true>;
}

test('rejects password reset email when mail transport is not configured', async () => {
  const service = new MailService(createConfig({}));

  await assert.rejects(() =>
    service.sendPasswordResetMail({
      email: 'user@example.com',
      expiresAt: '2026-06-09T12:00:00.000Z',
      identityId: 'identity-1',
      resetToken: 'token-1'
    })
  );
});

test('rejects password reset email when reset url base is missing', async () => {
  const service = new MailService(
    createConfig({
      MAIL_FROM_ADDRESS: 'noreply@careerhub.local',
      MAIL_HOST: '127.0.0.1',
      MAIL_PASSWORD: 'dev',
      MAIL_PORT: 1025,
      MAIL_USER: 'dev'
    })
  );

  await assert.rejects(() =>
    service.sendPasswordResetMail({
      email: 'user@example.com',
      expiresAt: '2026-06-09T12:00:00.000Z',
      identityId: 'identity-1',
      resetToken: 'token-1'
    })
  );
});
