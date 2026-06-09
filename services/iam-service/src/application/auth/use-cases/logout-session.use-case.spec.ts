import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidRefreshTokenError,
  type AuthSessionRepository,
  type AuthSessionRecord,
  type CreateAuthSessionInput,
  type TokenService
} from '../../index';
import { LogoutSessionCommandHandler } from '../../commands/logout-session/logout-session.command-handler';

class FakeAuthSessionRepository implements AuthSessionRepository {
  session: AuthSessionRecord | null = null;
  revokedSessionIds: string[] = [];

  async create(_input: CreateAuthSessionInput): Promise<void> {}

  async findByTokenHash(_tokenHash: string): Promise<AuthSessionRecord | null> {
    return this.session;
  }

  async revoke(sessionId: string): Promise<void> {
    this.revokedSessionIds.push(sessionId);
  }

  async revokeByIdentityId(): Promise<number> {
    return 0;
  }

  async rotate(): Promise<void> {}
}

class FakeTokenService implements TokenService {
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
    return `hash:${token}`;
  }

  issueAccessToken(): string {
    return 'unused';
  }

  verifyAccessToken(): { email: string; id: string; role: string } {
    return {
      email: 'unused@example.com',
      id: 'unused',
      role: 'candidate'
    };
  }
}

test('revokes the matching refresh session', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() + 60_000),
    id: 'session-logout-1',
    identityId: 'identity-logout-1',
    rememberMe: true,
    tokenHash: 'hash:refresh-token',
    updatedAt: new Date()
  };
  const useCase = new LogoutSessionCommandHandler(
    authSessionRepository,
    new FakeTokenService()
  );

  const result = await useCase.execute({
    refreshToken: 'refresh-token'
  });

  assert.equal(result.loggedOut, true);
  assert.deepEqual(authSessionRepository.revokedSessionIds, ['session-logout-1']);
});

test('fails when refresh session does not exist', async () => {
  const useCase = new LogoutSessionCommandHandler(
    new FakeAuthSessionRepository(),
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        refreshToken: 'missing-token'
      }),
    InvalidRefreshTokenError
  );
});
