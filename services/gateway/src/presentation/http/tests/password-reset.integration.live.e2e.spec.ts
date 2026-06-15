import assert from 'node:assert/strict';
import test from 'node:test';
import { createPgClient, type SqlClient } from './helpers/live-db';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { parseEnvFile, resolveServiceEnvPath } from './helpers/live-env';
import { pollUntil } from './helpers/live-polling';
import { startLocalSmtpSink } from './helpers/live-smtp-sink';
import {
  login,
  registerCandidate,
  requestPasswordReset,
  resetPassword,
  resetPasswordExpectFailure
} from './helpers/live-gateway-auth';

type PasswordResetTokenRow = {
  expires_at: Date;
  id: string;
  identity_id: string;
  mail_processing_at: Date | null;
  mail_sent_at: Date | null;
  token_hash: string;
  used_at: Date | null;
};

type OutboxRow = {
  event_name: string;
  id: string;
  payload_text: string;
  processed_at: Date | null;
  status: string;
};

function extractResetTokenFromSmtpMessage(body: string): string | undefined {
  const normalizedBody = body
    .replaceAll('&amp;', '&')
    .replaceAll('=3D', '=')
    .replace(/=\r?\n/g, '');
  const resetPasswordUrlBase = parseEnvFile(resolveServiceEnvPath('iam-service'))
    .RESET_PASSWORD_URL_BASE;

  if (!resetPasswordUrlBase) {
    return undefined;
  }

  const tokenMatch = normalizedBody.match(
    new RegExp(
      `${resetPasswordUrlBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?token=([^\\s"'<>]+)`
    )
  );

  if (!tokenMatch?.[1]) {
    return undefined;
  }

  return decodeURIComponent(tokenMatch[1]);
}

async function findIdentityIdByEmail(
  client: SqlClient,
  email: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    'select id from identities where email = $1',
    [email]
  );

  const identityId = result.rows[0]?.id;

  if (!identityId) {
    throw new Error(`Identity not found for ${email}`);
  }

  return identityId;
}

async function findLatestOutboxByRequestId(
  client: SqlClient,
  requestId: string
): Promise<OutboxRow | null> {
  const result = await client.query<OutboxRow>(
    `
      select
        id,
        event_name,
        status,
        processed_at,
        payload::text as payload_text
      from outbox
      where event_name = 'iam.password-reset-requested.v1'
        and payload->>'requestId' = $1
      order by occurred_at desc
      limit 1
    `,
    [requestId]
  );

  return result.rows[0] ?? null;
}

async function findPasswordResetTokenById(
  client: SqlClient,
  tokenId: string
): Promise<PasswordResetTokenRow | null> {
  const result = await client.query<PasswordResetTokenRow>(
    `
      select
        id,
        identity_id,
        token_hash,
        expires_at,
        used_at,
        mail_processing_at,
        mail_sent_at
      from password_reset_tokens
      where id = $1
    `,
    [tokenId]
  );

  return result.rows[0] ?? null;
}

async function countRevokedSessionsByIdentityId(
  client: SqlClient,
  identityId: string
): Promise<number> {
  const result = await client.query<{ total: string }>(
    `
      select count(*)::text as total
      from auth_sessions
      where identity_id = $1
        and revoked_at is not null
    `,
    [identityId]
  );

  return Number(result.rows[0]?.total ?? '0');
}

test(
  'password reset integration flow persists token and outbox, delivers mail, resets password, and revokes sessions',
  { timeout: 45_000 },
  async () => {
    const email = createUniqueEmail('candidate.password-reset.integration');
    const oldPassword = '12345678';
    const newPassword = '87654321';
    const registerRequestId = createRequestId('integration-register');
    const loginRequestId = createRequestId('integration-login');
    const forgotPasswordRequestId = createRequestId('integration-forgot-password');
    const resetRequestId = createRequestId('integration-reset-password');
    const reuseRequestId = createRequestId('integration-reset-password-reuse');
    const oldLoginFailureRequestId = createRequestId('integration-old-login-fail');
    const newLoginRequestId = createRequestId('integration-new-login');
    const smtpSink = await startLocalSmtpSink();

    const client = createPgClient('iam-service');
    await client.connect();

    try {
      const registerResult = await registerCandidate({
        email,
        fullName: 'Password Reset Integration Candidate',
        requestId: registerRequestId
      });
      assert.equal(registerResult.data.email, email);

      const initialLoginResult = await login({
        email,
        password: oldPassword,
        requestId: loginRequestId
      });
      assert.equal(initialLoginResult.response.status, 200);
      assert.equal(initialLoginResult.body.success, true);

      const identityId = await findIdentityIdByEmail(client, email);
      assert.equal(identityId, registerResult.data.userId);

      await requestPasswordReset({
        email,
        requestId: forgotPasswordRequestId
      });

      const outboxRow = await pollUntil(async () => {
        const row = await findLatestOutboxByRequestId(client, forgotPasswordRequestId);
        return row?.status === 'processed' ? row : null;
      });

      assert.equal(outboxRow.event_name, 'iam.password-reset-requested.v1');
      assert.equal(outboxRow.status, 'processed');
      assert.ok(outboxRow.processed_at instanceof Date);

      const outboxPayload = JSON.parse(outboxRow.payload_text) as {
        payload?: { resetTokenId?: string };
      };
      const resetTokenId = outboxPayload.payload?.resetTokenId;

      if (!resetTokenId) {
        throw new Error('resetTokenId was missing from IAM outbox payload');
      }

      const tokenRowBeforeReset = await pollUntil(async () => {
        const row = await findPasswordResetTokenById(client, resetTokenId);
        return row?.mail_sent_at ? row : null;
      });

      const resetToken = extractResetTokenFromSmtpMessage(
        smtpSink.messages.at(-1) ?? ''
      );

      if (!resetToken) {
        throw new Error('Password reset token was not found in the captured SMTP message');
      }

      assert.equal(outboxRow.payload_text.includes(resetToken), false);
      assert.equal(tokenRowBeforeReset.identity_id, identityId);
      assert.equal(tokenRowBeforeReset.used_at, null);
      assert.notEqual(tokenRowBeforeReset.token_hash, resetToken);
      assert.ok(tokenRowBeforeReset.expires_at instanceof Date);
      assert.ok(tokenRowBeforeReset.mail_sent_at instanceof Date);

      await resetPassword({
        newPassword,
        requestId: resetRequestId,
        token: resetToken
      });

      const tokenRowAfterReset = await pollUntil(async () => {
        const row = await findPasswordResetTokenById(client, resetTokenId);
        return row?.used_at ? row : null;
      });

      assert.ok(tokenRowAfterReset.used_at instanceof Date);

      const revokedSessionCount = await pollUntil(async () => {
        const count = await countRevokedSessionsByIdentityId(client, identityId);
        return count > 0 ? count : null;
      });

      assert.ok(revokedSessionCount >= 1);

      const reuseResult = await resetPasswordExpectFailure({
        newPassword: '76543210',
        requestId: reuseRequestId,
        token: resetToken
      });
      assert.equal(reuseResult.response.status, 400);
      assert.equal(
        reuseResult.body.error.message,
        'Password reset token is invalid or expired'
      );

      const oldLoginResult = await login({
        email,
        password: oldPassword,
        requestId: oldLoginFailureRequestId
      });
      assert.equal(oldLoginResult.response.status, 401);
      assert.equal(oldLoginResult.body.success, false);

      const newLoginResult = await login({
        email,
        password: newPassword,
        requestId: newLoginRequestId
      });
      assert.equal(newLoginResult.response.status, 200);
      assert.equal(newLoginResult.body.success, true);
    } finally {
      await client.end();
      await smtpSink.close();
    }
  }
);
