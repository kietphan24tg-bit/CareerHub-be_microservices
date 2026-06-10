import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { Email, Identity, IdentityStatus, PasswordHash, Role } from '../../../domain';
import {
  InvalidRefreshTokenError,
  InvalidTokenError,
  type AuthSessionRepository,
  type AuthSessionRecord,
  type CreateAuthSessionInput,
  type IdentityRepository,
  type TokenService
} from '../../index';
import { RefreshSessionCommandHandler } from '../../commands/refresh-session/refresh-session.command-handler';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

function createIdentity(
  status: 'active' | 'disabled' | 'pending_profile' = 'active'
): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-refresh-1'),
    props: {
      acceptedTerms: true,
      email: new Email('refresh@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status:
        status === 'active'
          ? IdentityStatus.active()
          : status === 'pending_profile'
            ? IdentityStatus.pendingProfile()
            : IdentityStatus.disabled()
    },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
}

class FakeAuthSessionRepository implements AuthSessionRepository {
  session: AuthSessionRecord | null = null;
  rotated: Array<{
    expiresAt: Date;
    sessionId: string;
    tokenHash: string;
  }> = [];

  async create(_input: CreateAuthSessionInput): Promise<void> {}

  async findByTokenHash(_tokenHash: string): Promise<AuthSessionRecord | null> {
    return this.session;
  }

  async revoke(): Promise<void> {}

  async revokeByIdentityId(): Promise<number> {
    return 0;
  }

  async rotate(
    sessionId: string,
    input: Pick<CreateAuthSessionInput, 'expiresAt' | 'tokenHash'>
  ): Promise<void> {
    this.rotated.push({
      expiresAt: input.expiresAt,
      sessionId,
      tokenHash: input.tokenHash
    });
  }
}

class FakeIdentityRepository implements IdentityRepository {
  identity: Identity | null = createIdentity();

  async existsByEmail(): Promise<boolean> {
    return this.identity !== null;
  }

  async findByEmail(): Promise<Identity | null> {
    return this.identity;
  }

  async findById(): Promise<Identity | null> {
    return this.identity;
  }

  async save(): Promise<void> {}

  async update(): Promise<void> {}

  async deleteById(): Promise<void> {}
}

class FakeTokenService implements TokenService {
  createRefreshToken(): string {
    return 'next-refresh-token';
  }

  getAccessTokenExpiresInMs(): number {
    return 15 * 60 * 1000;
  }

  getRefreshTokenExpiresInMs(): number {
    return 7 * 24 * 60 * 60 * 1000;
  }

  hashRefreshToken(token: string): string {
    return `hash:${token}`;
  }

  issueAccessToken(identity: { email: string; id: string; role: string }): string {
    return `access:${identity.id}`;
  }

  verifyAccessToken(): { email: string; id: string; role: string } {
    return {
      email: 'refresh@example.com',
      id: 'identity-refresh-1',
      role: 'candidate'
    };
  }
}

test('refreshes a session successfully and rotates the stored token hash', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() + 60_000),
    id: 'session-refresh-1',
    identityId: 'identity-refresh-1',
    rememberMe: true,
    tokenHash: 'hash:current-refresh-token',
    updatedAt: new Date()
  };
  const useCase = new RefreshSessionCommandHandler(
    authSessionRepository,
    new FakeIdentityRepository(),
    new FakeTokenService()
  );

  const result = await useCase.execute({
    refreshToken: 'current-refresh-token'
  });

  assert.equal(result.accessToken, 'access:identity-refresh-1');
  assert.equal(result.refreshToken, 'next-refresh-token');
  assert.equal(authSessionRepository.rotated.length, 1);
  assert.equal(authSessionRepository.rotated[0]?.sessionId, 'session-refresh-1');
  assert.equal(
    authSessionRepository.rotated[0]?.tokenHash,
    'hash:next-refresh-token'
  );
});

test('fails when session is revoked', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() + 60_000),
    id: 'session-refresh-2',
    identityId: 'identity-refresh-1',
    rememberMe: true,
    revokedAt: new Date(),
    tokenHash: 'hash:revoked-token',
    updatedAt: new Date()
  };
  const useCase = new RefreshSessionCommandHandler(
    authSessionRepository,
    new FakeIdentityRepository(),
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        refreshToken: 'revoked-token'
      }),
    InvalidRefreshTokenError
  );
});

test('fails when session is expired', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() - 1),
    id: 'session-refresh-3',
    identityId: 'identity-refresh-1',
    rememberMe: true,
    tokenHash: 'hash:expired-token',
    updatedAt: new Date()
  };
  const useCase = new RefreshSessionCommandHandler(
    authSessionRepository,
    new FakeIdentityRepository(),
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        refreshToken: 'expired-token'
      }),
    InvalidRefreshTokenError
  );
});

test('fails when identity is missing or disabled', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() + 60_000),
    id: 'session-refresh-4',
    identityId: 'identity-refresh-1',
    rememberMe: true,
    tokenHash: 'hash:current-refresh-token',
    updatedAt: new Date()
  };
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity('disabled');
  const useCase = new RefreshSessionCommandHandler(
    authSessionRepository,
    identityRepository,
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        refreshToken: 'current-refresh-token'
      }),
    InvalidTokenError
  );
});

test('fails when identity is pending profile activation', async () => {
  const authSessionRepository = new FakeAuthSessionRepository();
  authSessionRepository.session = {
    expiresAt: new Date(Date.now() + 60_000),
    id: 'session-refresh-5',
    identityId: 'identity-refresh-1',
    rememberMe: true,
    tokenHash: 'hash:current-refresh-token',
    updatedAt: new Date()
  };
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity('pending_profile');
  const useCase = new RefreshSessionCommandHandler(
    authSessionRepository,
    identityRepository,
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        refreshToken: 'current-refresh-token'
      }),
    InvalidTokenError
  );
});
