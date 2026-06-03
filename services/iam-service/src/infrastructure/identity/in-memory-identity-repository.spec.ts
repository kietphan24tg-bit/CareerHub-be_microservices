import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { Email, Identity, PasswordHash, Role } from '../../domain';
import { InMemoryIdentityRepository } from './in-memory-identity-repository';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

test('returns false before save and true after save for normalized email', async () => {
  const repository = new InMemoryIdentityRepository();
  const email = new Email('User@Example.com');

  assert.equal(await repository.existsByEmail(email), false);

  const identity = Identity.register({
    acceptedTerms: true,
    email,
    id: new UniqueEntityID('identity-1'),
    passwordHash: new PasswordHash(ARGON2ID_HASH),
    role: new Role('candidate')
  });

  await repository.save(identity);

  assert.equal(
    await repository.existsByEmail(new Email('user@example.com')),
    true
  );
});
