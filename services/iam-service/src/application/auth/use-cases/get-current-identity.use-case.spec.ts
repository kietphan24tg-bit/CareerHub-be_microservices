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
import { GetCurrentIdentityUseCase } from './get-current-identity.use-case';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

test('returns current identity details from repository', async () => {
  const useCase = new GetCurrentIdentityUseCase({
    async findById(identityId: string) {
      return Identity.reconstitute({
        id: new UniqueEntityID(identityId),
        createdAt: new Date('2026-06-05T00:00:00.000Z'),
        updatedAt: new Date('2026-06-05T00:00:00.000Z'),
        props: {
          acceptedTerms: true,
          email: new Email('candidate@example.com'),
          passwordHash: new PasswordHash(ARGON2ID_HASH),
          role: new Role('candidate'),
          status: IdentityStatus.active()
        }
      });
    }
  } as never);

  const result = await useCase.execute({
    identityId: 'identity-123'
  });

  assert.deepEqual(result, {
    email: 'candidate@example.com',
    identityId: 'identity-123',
    role: 'candidate',
    status: 'active'
  });
});

test('throws when identity does not exist', async () => {
  const useCase = new GetCurrentIdentityUseCase({
    async findById() {
      return null;
    }
  } as never);

  await assert.rejects(
    () =>
      useCase.execute({
        identityId: 'missing-identity'
      }),
    (error: unknown) =>
      error instanceof IdentityNotFoundError &&
      error.message === 'Identity not found: missing-identity'
  );
});
