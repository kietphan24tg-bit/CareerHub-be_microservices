import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidTokenError,
  type TokenService
} from '../../index';
import { ValidateAccessTokenUseCase } from './validate-access-token.use-case';

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
  const useCase = new ValidateAccessTokenUseCase(tokenService);

  const result = await useCase.execute({
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
  const useCase = new ValidateAccessTokenUseCase(new FakeTokenService());

  await assert.rejects(
    () =>
      useCase.execute({
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
  const useCase = new ValidateAccessTokenUseCase(tokenService);

  await assert.rejects(
    () =>
      useCase.execute({
        accessToken: 'invalid-token'
      }),
    InvalidTokenError
  );

  assert.deepEqual(tokenService.verifyCalls, ['invalid-token']);
});
