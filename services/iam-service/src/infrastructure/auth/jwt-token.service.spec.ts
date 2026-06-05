import assert from 'node:assert/strict';
import test from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { ValidationError } from '@careerhub/shared-kernel';
import { JwtTokenService } from './jwt-token.service';

function createTokenService(
  overrides?: Partial<{
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    secret: string;
  }>
): JwtTokenService {
  const secret = overrides?.secret ?? 'test-jwt-secret';

  return new JwtTokenService(new JwtService({ secret }), {
    accessTokenExpiresIn: overrides?.accessTokenExpiresIn ?? '15m',
    refreshTokenExpiresIn: overrides?.refreshTokenExpiresIn ?? '7d'
  });
}

test('issues and verifies an access token', () => {
  const tokenService = createTokenService();

  const accessToken = tokenService.issueAccessToken({
    email: 'jwt@example.com',
    id: 'identity-jwt-1',
    role: 'candidate'
  });

  const payload = tokenService.verifyAccessToken(accessToken);

  assert.equal(payload.id, 'identity-jwt-1');
  assert.equal(payload.email, 'jwt@example.com');
  assert.equal(payload.role, 'candidate');
});

test('rejects malformed access token', () => {
  const tokenService = createTokenService();

  assert.throws(
    () => tokenService.verifyAccessToken('not-a-jwt'),
    ValidationError
  );
});

test('rejects expired access token', () => {
  const jwtService = new JwtService({ secret: 'test-jwt-secret' });
  const tokenService = new JwtTokenService(jwtService, {
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d'
  });
  const expiredToken = jwtService.sign(
    {
      email: 'jwt@example.com',
      role: 'candidate',
      sub: 'identity-jwt-1'
    },
    {
      expiresIn: -1
    }
  );

  assert.throws(
    () => tokenService.verifyAccessToken(expiredToken),
    ValidationError
  );
});

test('creates refresh token and hashes it deterministically', () => {
  const tokenService = createTokenService();

  const refreshToken = tokenService.createRefreshToken();
  const tokenHash = tokenService.hashRefreshToken(refreshToken);

  assert.match(refreshToken, /^[a-f0-9]+$/);
  assert.equal(tokenHash, tokenService.hashRefreshToken(refreshToken));
});
