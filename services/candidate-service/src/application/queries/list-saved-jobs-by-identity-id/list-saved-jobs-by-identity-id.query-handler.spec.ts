import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { ListSavedJobsByIdentityIdQueryHandler } from './list-saved-jobs-by-identity-id.query-handler';

test('lists saved jobs by identity id', async () => {
  const handler = new ListSavedJobsByIdentityIdQueryHandler({
    async deleteByIdentityAndJobId() {},
    async findByIdentityAndJobId() {
      return null;
    },
    async findByIdentityId(identityId) {
      return [
        {
          createdAt: new Date('2026-06-11T00:00:00.000Z'),
          id: 'saved-job-1',
          identityId,
          jobId: 'job-1'
        }
      ];
    },
    async save() {
      throw new Error('unused');
    }
  });

  const result = await handler.execute({ identityId: 'identity-1' });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.jobId, 'job-1');
});

test('rejects blank identity id when listing saved jobs', async () => {
  const handler = new ListSavedJobsByIdentityIdQueryHandler({
    async deleteByIdentityAndJobId() {},
    async findByIdentityAndJobId() {
      return null;
    },
    async findByIdentityId() {
      return [];
    },
    async save() {
      throw new Error('unused');
    }
  });

  await assert.rejects(
    () => handler.execute({ identityId: ' ' }),
    ValidationError
  );
});
