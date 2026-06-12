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
import { IdentityNotFoundError } from '../../errors';
import type { IdentityRepository } from '../../ports';
import { ActivateIdentityCommandHandler } from '../../commands/activate-identity/activate-identity.command-handler';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

function createPendingIdentity(): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-activate-1'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.pendingProfile()
    },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
}

test('activates a pending identity and persists it', async () => {
  const identity = createPendingIdentity();
  const savedStatuses: string[] = [];
  const identityRepository: IdentityRepository = {
    async deleteById() {},
    async existsByEmail() {
      return true;
    },
    async findByEmail() {
      return identity;
    },
    async findById() {
      return identity;
    },
    async save() {},
    async update(nextIdentity: Identity) {
      savedStatuses.push(nextIdentity.status.value);
    }
  };
  const useCase = new ActivateIdentityCommandHandler(identityRepository);

  const result = await useCase.execute({
    identityId: 'identity-activate-1'
  });

  assert.equal(result.status, 'active');
  assert.deepEqual(savedStatuses, ['active']);
});

test('fails when identity does not exist', async () => {
  const identityRepository: IdentityRepository = {
    async deleteById() {},
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
    async update() {}
  };
  const useCase = new ActivateIdentityCommandHandler(identityRepository);

  await assert.rejects(
    () =>
      useCase.execute({
        identityId: 'missing-identity'
      }),
    IdentityNotFoundError
  );
});
