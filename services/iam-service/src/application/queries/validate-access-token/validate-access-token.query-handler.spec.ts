import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidTokenError, type TokenService } from '../../index';
import { ValidateAccessTokenQueryHandler } from './validate-access-token.query-handler';

class FakeTokenService implements TokenService {
  verifyCalls: string[] = [];
  verifyImpl: (token: string) => { email: string; id: string; role: string } = (
    token
  ) => ({
    email: `${token}@example.com`,
    id: 'identity-validate-1',
    role: 'candidate'
  });

  createRefreshToken(): string {
    return 'unused';
  }

  getAccessTokenExpiresInMs(): number {
    return 900_000;
  }

  getRefreshTokenExpiresInMs(): number {
    return 604_800_000;
  }

  hashRefreshToken(token: string): string {
    return token;
  }

  issueAccessToken(): string {
    return 'unused';
  }

  verifyAccessToken(token: string): { email: string; id: string; role: string } {
    this.verifyCalls.push(token);
    return this.verifyImpl(token);
  }
}

test('returns current identity payload when access token is valid', async () => {
  const tokenService = new FakeTokenService();
  const handler = new ValidateAccessTokenQueryHandler(tokenService);

  const result = await handler.execute({
    accessToken: 'valid-token'
  });

  assert.deepEqual(result, {
    email: 'valid-token@example.com',
    identityId: 'identity-validate-1',
    role: 'candidate'
  });
  assert.deepEqual(tokenService.verifyCalls, ['valid-token']);
});

test('fails when access token is blank', async () => {
  const handler = new ValidateAccessTokenQueryHandler(new FakeTokenService());

  await assert.rejects(
    () =>
      handler.execute({
        accessToken: '   '
      }),
    InvalidTokenError
  );
});

test('fails when token service rejects the access token', async () => {
  const tokenService = new FakeTokenService();
  tokenService.verifyImpl = () => {
    throw new Error('signature mismatch');
  };
  const handler = new ValidateAccessTokenQueryHandler(tokenService);

  await assert.rejects(
    () =>
      handler.execute({
        accessToken: 'invalid-token'
      }),
    InvalidTokenError
  );

  assert.deepEqual(tokenService.verifyCalls, ['invalid-token']);
});
