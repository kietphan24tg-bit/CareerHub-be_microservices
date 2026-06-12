import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import type { CandidateProfileRepository } from '../../ports';
import { DeleteCandidateProfileCompensationCommandHandler } from './delete-candidate-profile-compensation.command-handler';

function createRepository(
  overrides: Partial<CandidateProfileRepository> = {}
): CandidateProfileRepository {
  return {
    async clearResumeIdIfMatches() {},
    async deleteByIdentityId() {
      return true;
    },
    async existsByIdentityId() {
      return false;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async updateByIdentityId() {
      return null;
    },
    ...overrides
  };
}

test('reports deleted when a profile was removed', async () => {
  const deletedIds: string[] = [];
  const handler = new DeleteCandidateProfileCompensationCommandHandler(
    createRepository({
      async deleteByIdentityId(identityId) {
        deletedIds.push(identityId);
        return true;
      }
    })
  );

  const result = await handler.execute({ identityId: 'identity-1' });

  assert.deepEqual(result, { compensated: true, deleted: true });
  assert.deepEqual(deletedIds, ['identity-1']);
});

test('is idempotent when no profile exists', async () => {
  const handler = new DeleteCandidateProfileCompensationCommandHandler(
    createRepository({
      async deleteByIdentityId() {
        return false;
      }
    })
  );

  const result = await handler.execute({ identityId: 'identity-1' });

  assert.deepEqual(result, { compensated: true, deleted: false });
});

test('trims the identity id before deleting', async () => {
  const deletedIds: string[] = [];
  const handler = new DeleteCandidateProfileCompensationCommandHandler(
    createRepository({
      async deleteByIdentityId(identityId) {
        deletedIds.push(identityId);
        return true;
      }
    })
  );

  await handler.execute({ identityId: '  identity-1  ' });

  assert.deepEqual(deletedIds, ['identity-1']);
});

test('fails when identity id is blank', async () => {
  const handler = new DeleteCandidateProfileCompensationCommandHandler(
    createRepository({
      async deleteByIdentityId() {
        throw new Error('deleteByIdentityId should not be called');
      }
    })
  );

  await assert.rejects(
    () => handler.execute({ identityId: '   ' }),
    ValidationError
  );
});
