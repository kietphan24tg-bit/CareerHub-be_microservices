import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { Email, Identity, IdentityStatus, PasswordHash, Role } from '../../../domain';
import {
  InvalidCredentialsError,
  type AuthSessionRepository,
  type AuthSessionRecord,
  type CreateAuthSessionInput,
  type IdGenerator,
  type IdentityRepository,
  type PasswordHasher,
  type TokenService
} from '../../index';
import { LoginIdentityUseCase } from './login-identity.use-case';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

function createIdentity(
  status: 'active' | 'disabled' | 'pending_profile' = 'active'
): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-auth-1'),
    props: {
      acceptedTerms: true,
      email: new Email('candidate@example.com'),
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

class FakeIdentityRepository implements IdentityRepository {
  identity: Identity | null = null;

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
}

class FakePasswordHasher implements PasswordHasher {
  verifyResult = true;
  verifyCalls: Array<{ hash: string; password: string }> = [];

  async hash(password: string): Promise<string> {
    return password;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    this.verifyCalls.push({ hash, password });
    return this.verifyResult;
  }
}

class FakeAuthSessionRepository implements AuthSessionRepository {
  createdSessions: CreateAuthSessionInput[] = [];

  async create(input: CreateAuthSessionInput): Promise<void> {
    this.createdSessions.push(input);
  }

  async findByTokenHash(): Promise<AuthSessionRecord | null> {
    return null;
  }

  async revoke(): Promise<void> {}

  async rotate(): Promise<void> {}
}

class FakeTokenService implements TokenService {
  issueCalls: Array<{ email: string; id: string; role: string }> = [];

  createRefreshToken(): string {
    return 'refresh-token-1';
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
    this.issueCalls.push(identity);
    return 'access-token-1';
  }

  verifyAccessToken(): { email: string; id: string; role: string } {
    return {
      email: 'candidate@example.com',
      id: 'identity-auth-1',
      role: 'candidate'
    };
  }
}

class FakeIdGenerator implements IdGenerator {
  generate(): string {
    return 'session-1';
  }
}

test('logs in successfully and creates a refresh session', async () => {
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity();
  const passwordHasher = new FakePasswordHasher();
  const authSessionRepository = new FakeAuthSessionRepository();
  const tokenService = new FakeTokenService();
  const useCase = new LoginIdentityUseCase(
    identityRepository,
    passwordHasher,
    authSessionRepository,
    tokenService,
    new FakeIdGenerator()
  );

  const result = await useCase.execute({
    email: 'candidate@example.com',
    password: '12345678',
    rememberMe: true
  });

  assert.equal(result.accessToken, 'access-token-1');
  assert.equal(result.refreshToken, 'refresh-token-1');
  assert.equal(result.identityId, 'identity-auth-1');
  assert.equal(authSessionRepository.createdSessions.length, 1);
  assert.equal(authSessionRepository.createdSessions[0]?.id, 'session-1');
  assert.equal(authSessionRepository.createdSessions[0]?.rememberMe, true);
  assert.equal(
    authSessionRepository.createdSessions[0]?.tokenHash,
    'hash:refresh-token-1'
  );
  assert.deepEqual(passwordHasher.verifyCalls, [
    {
      hash: ARGON2ID_HASH,
      password: '12345678'
    }
  ]);
});

test('fails when identity does not exist', async () => {
  const useCase = new LoginIdentityUseCase(
    new FakeIdentityRepository(),
    new FakePasswordHasher(),
    new FakeAuthSessionRepository(),
    new FakeTokenService(),
    new FakeIdGenerator()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        email: 'missing@example.com',
        password: '12345678'
      }),
    InvalidCredentialsError
  );
});

test('fails when password does not match', async () => {
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity();
  const passwordHasher = new FakePasswordHasher();
  passwordHasher.verifyResult = false;
  const authSessionRepository = new FakeAuthSessionRepository();
  const useCase = new LoginIdentityUseCase(
    identityRepository,
    passwordHasher,
    authSessionRepository,
    new FakeTokenService(),
    new FakeIdGenerator()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        email: 'candidate@example.com',
        password: 'wrong-password'
      }),
    InvalidCredentialsError
  );

  assert.equal(authSessionRepository.createdSessions.length, 0);
});

test('fails when identity is disabled', async () => {
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity('disabled');
  const useCase = new LoginIdentityUseCase(
    identityRepository,
    new FakePasswordHasher(),
    new FakeAuthSessionRepository(),
    new FakeTokenService(),
    new FakeIdGenerator()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        email: 'candidate@example.com',
        password: '12345678'
      }),
    InvalidCredentialsError
  );
});

test('fails when identity is pending profile activation', async () => {
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity('pending_profile');
  const useCase = new LoginIdentityUseCase(
    identityRepository,
    new FakePasswordHasher(),
    new FakeAuthSessionRepository(),
    new FakeTokenService(),
    new FakeIdGenerator()
  );

  await assert.rejects(
    () =>
      useCase.execute({
        email: 'candidate@example.com',
        password: '12345678'
      }),
    InvalidCredentialsError
  );
});
