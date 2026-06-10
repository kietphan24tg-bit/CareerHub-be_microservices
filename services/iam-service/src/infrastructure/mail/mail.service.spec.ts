import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from '../../config';
import { MailConfigurationError, MailService } from './mail.service';

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

  await assert.rejects(
    () =>
      service.sendPasswordResetMail({
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:00:00.000Z',
        identityId: 'identity-1',
        resetToken: 'token-1'
      }),
    MailConfigurationError
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

  await assert.rejects(
    () =>
      service.sendPasswordResetMail({
        email: 'user@example.com',
        expiresAt: '2026-06-09T12:00:00.000Z',
        identityId: 'identity-1',
        resetToken: 'token-1'
      }),
    MailConfigurationError
  );
});

test('sends password reset email with encoded reset URL', async () => {
  const sentMessages: unknown[] = [];
  const transporter = {
    async sendMail(message: unknown) {
      sentMessages.push(message);
    }
  };
  const service = new MailService(
    createConfig({
      MAIL_FROM_ADDRESS: 'noreply@careerhub.local',
      MAIL_FROM_NAME: 'CareerHub "Dev"',
      MAIL_HOST: '127.0.0.1',
      MAIL_PASSWORD: 'dev',
      MAIL_PORT: 1025,
      MAIL_SECURE: false,
      MAIL_USER: 'dev',
      RESET_PASSWORD_URL_BASE: 'http://localhost:5173/reset-password'
    }),
    (() => transporter) as never
  );

  await service.sendPasswordResetMail({
    email: 'user@example.com',
    expiresAt: '2026-06-09T12:00:00.000Z',
    identityId: 'identity-1',
    resetToken: 'token.with/slash+plus'
  });

  assert.equal(sentMessages.length, 1);
  const message = sentMessages[0] as {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string;
  };
  const expectedUrl =
    'http://localhost:5173/reset-password?token=token.with%2Fslash%2Bplus';

  assert.equal(message.from, '"CareerHub \\"Dev\\"" <noreply@careerhub.local>');
  assert.equal(message.subject, 'Reset your CareerHub password');
  assert.equal(message.to, 'user@example.com');
  assert.ok(message.text.includes(expectedUrl));
  assert.ok(message.html.includes(expectedUrl));
});
