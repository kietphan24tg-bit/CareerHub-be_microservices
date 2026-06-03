import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { UserRegisteredEvent, type Email, type Identity } from '../../../domain';
import { IdentityAlreadyExistsError } from '../../errors';
import type {
  IdGenerator,
  IdentityRepository,
  PasswordHasher
} from '../../ports';
import { RegisterIdentityUseCase } from './register-identity.use-case';

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

  async save(identity: Identity): Promise<void> {
    this.savedIdentities.push(identity);
    this.existingEmails.add(identity.email.value);
  }
}

class FakePasswordHasher implements PasswordHasher {
  calls: string[] = [];

  async hash(password: string): Promise<string> {
    this.calls.push(password);
    return ARGON2ID_HASH;
  }
}

test('registers identity successfully and persists aggregate', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityUseCase(
    repository,
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
  assert.equal(result.status, 'active');
  assert.ok(result.createdAt);
  assert.deepEqual(passwordHasher.calls, ['plain-password']);
  assert.equal(repository.existsByEmailCalls, 1);
  assert.equal(repository.savedIdentities.length, 1);
  assert.equal(repository.savedIdentities[0]?.passwordHash.value, ARGON2ID_HASH);
  assert.equal(repository.savedIdentities[0]?.domainEvents.length, 1);
  assert.ok(repository.savedIdentities[0]?.domainEvents[0] instanceof UserRegisteredEvent);
  assert.equal(result.domainEvents.length, 1);
  assert.ok(result.domainEvents[0] instanceof UserRegisteredEvent);
});

test('fails when identity already exists', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher = new FakePasswordHasher();
  repository.existingEmails.add('user@example.com');
  const useCase = new RegisterIdentityUseCase(
    repository,
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
});

test('fails when email is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityUseCase(
    repository,
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
});

test('fails when accepted terms is false', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityUseCase(
    repository,
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
});

test('fails when role is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterIdentityUseCase(
    repository,
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
    ValidationError
  );

  assert.deepEqual(passwordHasher.calls, []);
  assert.equal(repository.existsByEmailCalls, 0);
  assert.equal(repository.savedIdentities.length, 0);
});

test('fails when password hash returned by hasher is invalid', async () => {
  const repository = new InMemoryIdentityRepository();
  const passwordHasher: PasswordHasher = {
    async hash(): Promise<string> {
      return 'short';
    }
  };
  const useCase = new RegisterIdentityUseCase(
    repository,
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
});
