import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboxRecord } from '@careerhub/contracts';
import { ValidationError } from '@careerhub/shared-kernel';
import {
  InvalidRoleError,
  UserRegisteredEvent,
  type Email,
  type Identity
} from '../../../domain';
import { IdentityAlreadyExistsError } from '../../errors';
import type {
  IdGenerator,
  IamWriteTransaction,
  IdentityRepository,
  OutboxRepository,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
  PasswordHasher
} from '../../ports';
import { RegisterIdentityCommandHandler } from './register-identity.command-handler';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

class FakeIdGenerator implements IdGenerator {
  constructor(private readonly nextId: string) {}

  generate(): string {
    return this.nextId;
  }
}

class InMemoryIdentityRepository implements IdentityRepository {
  savedIdentities: Identity[] = [];
  existingEmails = new Set<string>();
  existsByEmailCalls = 0;

  async existsByEmail(email: Email): Promise<boolean> {
    this.existsByEmailCalls += 1;
    return this.existingEmails.has(email.value);
  }

  async findByEmail(): Promise<Identity | null> {
    return null;
  }

  async findById(): Promise<Identity | null> {
    return null;
  }

  async save(identity: Identity): Promise<void> {
    this.savedIdentities.push(identity);
    this.existingEmails.add(identity.email.value);
  }

  async update(): Promise<void> {}
}

class InMemoryOutboxRepository implements OutboxRepository {
  records: OutboxRecord[] = [];

  async claimPending(): Promise<OutboxRecord | null> {
    return null;
  }

  async create(record: OutboxRecord): Promise<void> {
    this.records.push(record);
  }

  async deleteProcessedBatch(): Promise<number> {
    return 0;
  }

  async findPendingBatch(): Promise<OutboxRecord[]> {
    return [];
  }

  async markFailed(): Promise<void> {}

  async markProcessed(): Promise<void> {}

  async requeueRetryableFailed(): Promise<number> {
    return 0;
  }

  async requeueStaleProcessing(): Promise<number> {
    return 0;
  }

  async summarizeBacklog() {
    return {
      failed: 0,
      pending: 0,
      processing: 0
    };
  }
}

class FakeIamWriteTransaction implements IamWriteTransaction {
  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly outboxRepository: OutboxRepository
  ) {}

  async execute<T>(
    work: Parameters<IamWriteTransaction['execute']>[0]
  ): Promise<T> {
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
      },
      identityRepository: this.identityRepository,
      outboxRepository: this.outboxRepository,
      passwordResetTokenRepository: {
        async claimMailDelivery() {
          return true;
        },
        async clearMailDeliveryClaim() {},
        async create() {},
        async findByTokenHash(): Promise<PasswordResetTokenRecord | null> {
          return null;
        },
        async invalidateActiveForIdentity() {
          return 0;
        },
        async markMailSent() {},
        async markUsed() {}
      } satisfies PasswordResetTokenRepository
    })) as T;
  }
}

class FakePasswordHasher implements PasswordHasher {
  calls: string[] = [];

  async hash(password: string): Promise<string> {
    this.calls.push(password);
    return ARGON2ID_HASH;
  }

  async verify(): Promise<boolean> {
    return true;
  }
}

test('registers identity successfully and persists aggregate', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-1'),
    passwordHasher
  );

  const result = await useCase.execute({
    acceptedTerms: true,
    email: 'user@example.com',
    password: 'plain-password',
    requestId: 'req-1',
    role: 'candidate'
  });

  assert.equal(result.identityId, 'identity-application-1');
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.role, 'candidate');
  assert.equal(result.status, 'pending_profile');
  assert.ok(result.createdAt);
  assert.deepEqual(passwordHasher.calls, ['plain-password']);
  assert.equal(repository.existsByEmailCalls, 1);
  assert.equal(repository.savedIdentities.length, 1);
  assert.equal(repository.savedIdentities[0]?.passwordHash.value, ARGON2ID_HASH);
  assert.equal(repository.savedIdentities[0]?.domainEvents.length, 0);
  assert.equal(result.domainEvents.length, 1);
  assert.ok(result.domainEvents[0] instanceof UserRegisteredEvent);
  assert.equal(outboxRepository.records.length, 1);
  assert.equal(outboxRepository.records[0]?.eventName, 'iam.user.registered.v1');
});

test('fails when identity already exists', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher = new FakePasswordHasher();
  repository.existingEmails.add('user@example.com');
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-2'),
    passwordHasher
  );

  await assert.rejects(
    () =>
      useCase.execute({
        acceptedTerms: true,
        email: 'user@example.com',
        password: 'plain-password',
        role: 'candidate'
      }),
    IdentityAlreadyExistsError
  );

  assert.deepEqual(passwordHasher.calls, []);
  assert.equal(repository.existsByEmailCalls, 1);
  assert.equal(repository.savedIdentities.length, 0);
  assert.equal(outboxRepository.records.length, 0);
});

test('fails when email is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-3'),
    passwordHasher
  );

  await assert.rejects(
    () =>
      useCase.execute({
        acceptedTerms: true,
        email: 'invalid-email',
        password: 'plain-password',
        role: 'candidate'
      }),
    ValidationError
  );

  assert.deepEqual(passwordHasher.calls, []);
  assert.equal(repository.existsByEmailCalls, 0);
  assert.equal(repository.savedIdentities.length, 0);
  assert.equal(outboxRepository.records.length, 0);
});

test('fails when accepted terms is false', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-4'),
    passwordHasher
  );

  await assert.rejects(
    () =>
      useCase.execute({
        acceptedTerms: false,
        email: 'user@example.com',
        password: 'plain-password',
        role: 'candidate'
      }),
    ValidationError
  );

  assert.deepEqual(passwordHasher.calls, []);
  assert.equal(repository.existsByEmailCalls, 0);
  assert.equal(repository.savedIdentities.length, 0);
  assert.equal(outboxRepository.records.length, 0);
});

test('fails when role is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-5'),
    passwordHasher
  );

  await assert.rejects(
    () =>
      useCase.execute({
        acceptedTerms: true,
        email: 'user@example.com',
        password: 'plain-password',
        role: 'admin'
      }),
    InvalidRoleError
  );

  assert.deepEqual(passwordHasher.calls, []);
  assert.equal(repository.existsByEmailCalls, 0);
  assert.equal(repository.savedIdentities.length, 0);
  assert.equal(outboxRepository.records.length, 0);
});

test('fails when password hash returned by hasher is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const passwordHasher: PasswordHasher = {
    async hash(): Promise<string> {
      return 'short';
    },
    async verify(): Promise<boolean> {
      return true;
    }
  };
  const useCase = new RegisterIdentityCommandHandler(
    repository,
    new FakeIamWriteTransaction(repository, outboxRepository),
    new FakeIdGenerator('identity-application-6'),
    passwordHasher
  );

  await assert.rejects(
    () =>
      useCase.execute({
        acceptedTerms: true,
        email: 'user@example.com',
        password: 'plain-password',
        role: 'candidate'
      }),
    ValidationError
  );

  assert.equal(repository.existsByEmailCalls, 1);
  assert.equal(repository.savedIdentities.length, 0);
  assert.equal(outboxRepository.records.length, 0);
});
