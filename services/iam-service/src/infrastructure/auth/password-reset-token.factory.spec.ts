import assert from 'node:assert/strict';
import test from 'node:test';
import { PasswordResetTokenFactory } from './password-reset-token.factory';

test('creates deterministic password reset token from persisted metadata and secret', () => {
  const factory = new PasswordResetTokenFactory('test-secret');
  const parts = {
    expiresAt: '2026-06-09T12:00:00.000Z',
    identityId: 'identity-1',
    tokenId: 'reset-token-1'
  };

  const first = factory.createToken(parts);
  const second = factory.createToken(parts);

  assert.equal(first, second);
  assert.match(first, /^reset-token-1\.[A-Za-z0-9_-]+$/);
});

test('creates different password reset token when secret changes', () => {
  const parts = {
    expiresAt: '2026-06-09T12:00:00.000Z',
    identityId: 'identity-1',
    tokenId: 'reset-token-1'
  };

  assert.notEqual(
    new PasswordResetTokenFactory('first-secret').createToken(parts),
    new PasswordResetTokenFactory('second-secret').createToken(parts)
  );
});
