import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { RemoveSavedJobCommandHandler } from './remove-saved-job.command-handler';

test('remove saved job deletes by identity and job id', async () => {
  const deleted: Array<{ identityId: string; jobId: string }> = [];
  const handler = new RemoveSavedJobCommandHandler({
    async deleteByIdentityAndJobId(identityId, jobId) {
      deleted.push({ identityId, jobId });
    },
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

  await handler.execute({
    identityId: 'identity-1',
    jobId: 'job-1'
  });

  assert.deepEqual(deleted, [{ identityId: 'identity-1', jobId: 'job-1' }]);
});

test('remove saved job is idempotent when record is missing', async () => {
  const handler = new RemoveSavedJobCommandHandler({
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

  await handler.execute({
    identityId: 'identity-1',
    jobId: 'job-1'
  });
});

test('remove saved job rejects blank identity id', async () => {
  const handler = new RemoveSavedJobCommandHandler({
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
    () =>
      handler.execute({
        identityId: ' ',
        jobId: 'job-1'
      }),
    ValidationError
  );
});
