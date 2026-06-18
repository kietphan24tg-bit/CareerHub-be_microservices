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
import type {
  AuthSessionRepository,
  CreatePasswordResetTokenInput,
  IamWriteTransaction,
  IdentityRepository,
  PasswordResetTokenGenerator,
  PasswordResetTokenRepository,
  TokenService
} from '../../ports';
import type { OutboxRecord } from '@careerhub/contracts';
import type { OutboxRepository } from '../../ports/outbox/outbox-repository.port';
import type { IdGenerator } from '../../ports/identity/id-generator.port';
import { RequestPasswordResetCommandHandler } from './request-password-reset.command-handler';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

function createIdentity(): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-reset-1'),
    props: {
      acceptedTerms: true,
      email: new Email('candidate@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.active()
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

  async deleteById(): Promise<void> {}
}

class FakePasswordResetTokenRepository implements PasswordResetTokenRepository {
  created: CreatePasswordResetTokenInput[] = [];
  invalidated: Array<{ identityId: string; usedAt: Date }> = [];

  async claimMailDelivery(): Promise<boolean> {
    return true;
  }

  async clearMailDeliveryClaim(): Promise<void> {}

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    this.created.push(input);
  }

  async findByTokenHash() {
    return null;
  }

  async invalidateActiveForIdentity(identityId: string, usedAt: Date): Promise<number> {
    this.invalidated.push({ identityId, usedAt });
    return 0;
  }

  async markMailSent(): Promise<void> {}

  async markUsed(): Promise<void> {}
}

class FakeTokenService implements TokenService {
  createRefreshToken(): string {
    return 'reset-token-raw';
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

  issueAccessToken() {
    return 'unused';
  }

  verifyAccessToken() {
    return {
      email: 'candidate@example.com',
      id: 'identity-reset-1',
      role: 'candidate'
    };
  }
}

class FakePasswordResetTokenGenerator implements PasswordResetTokenGenerator {
  createToken(): string {
    return 'derived-reset-token';
  }
}

class FakeOutboxRepository implements OutboxRepository {
  created: OutboxRecord[] = [];

  async claimPending() {
    return null;
  }

  async create(record: OutboxRecord): Promise<void> {
    this.created.push(record);
  }

  async deleteFailedBatch() {
    return 0;
  }

  async deleteProcessedBatch() {
    return 0;
  }

  async findAndClaimPendingBatch() {
    return [];
  }

  async findPendingBatch() {
    return [];
  }

  async markFailed() {}

  async markProcessed() {}

  async requeueRetryableFailed() {
    return 0;
  }

  async requeueStaleProcessing() {
    return 0;
  }

  async summarizeBacklog() {
    return { failed: 0, pending: 0, processing: 0 };
  }
}

class FakeWriteTransaction implements IamWriteTransaction {
  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly outboxRepository: OutboxRepository
  ) {}

  async execute<T>(work: Parameters<IamWriteTransaction['execute']>[0]): Promise<T> {
    return (await work({
      authSessionRepository: {
        async create() {},
        async findByTokenHash() {
          return null;
        },
        async revoke() {},
        async revokeByIdentityId() {
          return 0;
        },
        async rotate() {}
      } satisfies AuthSessionRepository,
      identityRepository: {
        async existsByEmail() {
          return false;
        },
        async findByEmail() {
          return null;
        },
        async findById() {
          return null;
        },
        async save() {},
        async update() {},
        async deleteById() {}
      } satisfies IdentityRepository,
      outboxRepository: this.outboxRepository,
      passwordResetTokenRepository: this.passwordResetTokenRepository
    })) as T;
  }
}

class FakeIdGenerator implements IdGenerator {
  generate(): string {
    return 'password-reset-token-1';
  }
}

test('creates a password reset token when the identity exists', async () => {
  const identityRepository = new FakeIdentityRepository();
  identityRepository.identity = createIdentity();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const outboxRepository = new FakeOutboxRepository();
  const handler = new RequestPasswordResetCommandHandler(
    identityRepository,
    new FakeWriteTransaction(passwordResetTokenRepository, outboxRepository),
    new FakeIdGenerator(),
    new FakeTokenService(),
    new FakePasswordResetTokenGenerator(),
    10 * 60 * 1000
  );

  const result = await handler.execute({
    email: 'candidate@example.com',
    requestId: 'req-1'
  });

  assert.equal(result.accepted, true);
  assert.equal(passwordResetTokenRepository.invalidated.length, 1);
  assert.equal(passwordResetTokenRepository.created.length, 1);
  assert.equal(
    passwordResetTokenRepository.created[0]?.tokenHash,
    'hash:derived-reset-token'
  );
  assert.equal(outboxRepository.created.length, 1);
  assert.equal(
    outboxRepository.created[0]?.eventName,
    'iam.password-reset-requested.v1'
  );
  assert.deepEqual(outboxRepository.created[0]?.payload, {
    name: 'iam.password-reset-requested.v1',
    occurredAt: (outboxRepository.created[0]?.payload as { occurredAt: string })
      .occurredAt,
    payload: {
      email: 'candidate@example.com',
      expiresAt: (outboxRepository.created[0]?.payload as {
        payload: { expiresAt: string };
      }).payload.expiresAt,
      identityId: 'identity-reset-1',
      occurredAt: (outboxRepository.created[0]?.payload as {
        payload: { occurredAt: string };
      }).payload.occurredAt,
      resetTokenId: 'password-reset-token-1'
    },
    requestId: 'req-1',
    version: 1
  });
  assert.equal(
    JSON.stringify(outboxRepository.created[0]?.payload).includes(
      'derived-reset-token'
    ),
    false
  );
});

test('returns a generic accepted response when the email does not exist', async () => {
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const handler = new RequestPasswordResetCommandHandler(
    new FakeIdentityRepository(),
    new FakeWriteTransaction(passwordResetTokenRepository, new FakeOutboxRepository()),
    new FakeIdGenerator(),
    new FakeTokenService(),
    new FakePasswordResetTokenGenerator(),
    10 * 60 * 1000
  );

  const result = await handler.execute({
    email: 'missing@example.com'
  });

  assert.deepEqual(result, {
    accepted: true
  });
  assert.equal(passwordResetTokenRepository.created.length, 0);
});
