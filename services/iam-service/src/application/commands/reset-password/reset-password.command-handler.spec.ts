import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import {
  Email,
  Identity,
  IdentityStatus,
  PasswordHash,
  Role
} from '../../../domain';
import {
  InvalidCredentialsError,
  InvalidPasswordResetTokenError
} from '../../errors';
import type {
  AuthSessionRepository,
  IamWriteTransaction,
  IdentityRepository,
  PasswordHasher,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
  TokenService
} from '../../ports';
import type { OutboxRepository } from '../../ports/outbox/outbox-repository.port';
import { LoginIdentityCommandHandler } from '../login-identity/login-identity.command-handler';
import { ResetPasswordCommandHandler } from './reset-password.command-handler';

const CURRENT_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';
const NEXT_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$bmV4dGhhc2gxMjM0NTY3ODkw';

function createIdentity(passwordHash = CURRENT_HASH): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-reset-2'),
    props: {
      acceptedTerms: true,
      email: new Email('candidate@example.com'),
      passwordHash: new PasswordHash(passwordHash),
      role: new Role('candidate'),
      status: IdentityStatus.active()
    },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
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

  async update(identity: Identity): Promise<void> {
    this.identity = identity;
  }

  async deleteById(): Promise<void> {}
}

class FakePasswordResetTokenRepository implements PasswordResetTokenRepository {
  token: PasswordResetTokenRecord | null = {
    createdAt: new Date('2026-06-09T00:00:00.000Z'),
    expiresAt: new Date(Date.now() + 60_000),
    id: 'prt-1',
    identityId: 'identity-reset-2',
    tokenHash: 'hash:reset-token-raw'
  };
  invalidatedIdentityIds: string[] = [];
  markedUsedTokenIds: string[] = [];

  async claimMailDelivery(): Promise<boolean> {
    return true;
  }

  async clearMailDeliveryClaim(): Promise<void> {}

  async create(): Promise<void> {}

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return this.token?.tokenHash === tokenHash ? this.token : null;
  }

  async invalidateActiveForIdentity(identityId: string): Promise<number> {
    this.invalidatedIdentityIds.push(identityId);
    return 1;
  }

  async markMailSent(): Promise<void> {}

  async markUsed(tokenId: string): Promise<void> {
    this.markedUsedTokenIds.push(tokenId);
    if (this.token?.id === tokenId) {
      this.token = {
        ...this.token,
        usedAt: new Date()
      };
    }
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return password === 'new-password-1' ? NEXT_HASH : CURRENT_HASH;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return (
      (password === 'old-password-1' && hash === CURRENT_HASH) ||
      (password === 'new-password-1' && hash === NEXT_HASH)
    );
  }
}

class FakeTokenService implements TokenService {
  createRefreshToken(): string {
    return 'refresh-token-1';
  }

  getAccessTokenExpiresInMs(): number {
    return 0;
  }

  getRefreshTokenExpiresInMs(): number {
    return 0;
  }

  hashRefreshToken(token: string): string {
    return `hash:${token}`;
  }

  issueAccessToken(identity: { email: string; id: string; role: string }): string {
    return `access:${identity.id}`;
  }

  verifyAccessToken() {
    return {
      email: 'candidate@example.com',
      id: 'identity-reset-2',
      role: 'candidate'
    };
  }
}

class FakeWriteTransaction implements IamWriteTransaction {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly authSessionRepository: AuthSessionRepository
  ) {}

  async execute<T>(work: Parameters<IamWriteTransaction['execute']>[0]): Promise<T> {
    return (await work({
      authSessionRepository: this.authSessionRepository,
      identityRepository: this.identityRepository,
      outboxRepository: {
        async claimPending() {
          return null;
        },
        async create() {},
        async deleteFailedBatch() {
          return 0;
        },
        async deleteProcessedBatch() {
          return 0;
        },
        async findPendingBatch() {
          return [];
        },
        async markFailed() {},
        async markProcessed() {},
        async requeueRetryableFailed() {
          return 0;
        },
        async requeueStaleProcessing() {
          return 0;
        },
        async summarizeBacklog() {
          return { failed: 0, pending: 0, processing: 0 };
        }
      } satisfies OutboxRepository,
      passwordResetTokenRepository: this.passwordResetTokenRepository
    })) as T;
  }
}

class FakeAuthSessionRepository implements AuthSessionRepository {
  revokedIdentityIds: string[] = [];

  async create(): Promise<void> {}

  async findByTokenHash() {
    return null;
  }

  async revoke(): Promise<void> {}

  async revokeByIdentityId(identityId: string): Promise<number> {
    this.revokedIdentityIds.push(identityId);
    return 1;
  }

  async rotate(): Promise<void> {}
}

test('resets password, invalidates reset token, and revokes sessions', async () => {
  const identityRepository = new FakeIdentityRepository();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const authSessionRepository = new FakeAuthSessionRepository();
  const tokenService = new FakeTokenService();
  const passwordHasher = new FakePasswordHasher();
  const handler = new ResetPasswordCommandHandler(
    passwordResetTokenRepository,
    identityRepository,
    new FakeWriteTransaction(
      identityRepository,
      passwordResetTokenRepository,
      authSessionRepository
    ),
    passwordHasher,
    tokenService
  );

  const result = await handler.execute({
    newPassword: 'new-password-1',
    token: 'reset-token-raw'
  });

  assert.deepEqual(result, {
    passwordReset: true
  });
  assert.equal(passwordResetTokenRepository.markedUsedTokenIds.length, 1);
  assert.deepEqual(authSessionRepository.revokedIdentityIds, ['identity-reset-2']);

  const loginHandler = new LoginIdentityCommandHandler(
    identityRepository,
    passwordHasher,
    authSessionRepository,
    tokenService,
    { generate: () => 'session-1' }
  );

  await assert.rejects(
    () =>
      loginHandler.execute({
        email: 'candidate@example.com',
        password: 'old-password-1'
      }),
    InvalidCredentialsError
  );

  const loginResult = await loginHandler.execute({
    email: 'candidate@example.com',
    password: 'new-password-1'
  });

  assert.equal(loginResult.identityId, 'identity-reset-2');
});

test('fails when password reset token is expired', async () => {
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  passwordResetTokenRepository.token = {
    ...passwordResetTokenRepository.token!,
    expiresAt: new Date(Date.now() - 1)
  };
  const handler = new ResetPasswordCommandHandler(
    passwordResetTokenRepository,
    new FakeIdentityRepository(),
    new FakeWriteTransaction(
      new FakeIdentityRepository(),
      passwordResetTokenRepository,
      new FakeAuthSessionRepository()
    ),
    new FakePasswordHasher(),
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      handler.execute({
        newPassword: 'new-password-1',
        token: 'reset-token-raw'
      }),
    InvalidPasswordResetTokenError
  );
});

test('fails when password reset token has already been used', async () => {
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  passwordResetTokenRepository.token = {
    ...passwordResetTokenRepository.token!,
    usedAt: new Date()
  };
  const handler = new ResetPasswordCommandHandler(
    passwordResetTokenRepository,
    new FakeIdentityRepository(),
    new FakeWriteTransaction(
      new FakeIdentityRepository(),
      passwordResetTokenRepository,
      new FakeAuthSessionRepository()
    ),
    new FakePasswordHasher(),
    new FakeTokenService()
  );

  await assert.rejects(
    () =>
      handler.execute({
        newPassword: 'new-password-1',
        token: 'reset-token-raw'
      }),
    InvalidPasswordResetTokenError
  );
});
