import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import type { SavedJobRecord } from '../../ports';
import { SaveJobCommandHandler } from './save-job.command-handler';

test('save job creates a new saved job record', async () => {
  const saved: SavedJobRecord[] = [];
  const handler = new SaveJobCommandHandler(
    {
      async deleteByIdentityAndJobId() {},
      async findByIdentityAndJobId() {
        return null;
      },
      async findByIdentityId() {
        return [];
      },
      async save(record) {
        saved.push(record);
        return record;
      }
    },
    {
      generate() {
        return 'saved-job-1';
      }
    }
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    jobId: 'job-1'
  });

  assert.equal(result.id, 'saved-job-1');
  assert.equal(saved.length, 1);
});

test('save job is idempotent when already saved', async () => {
  const existing: SavedJobRecord = {
    createdAt: new Date('2026-06-11T00:00:00.000Z'),
    id: 'saved-job-1',
    identityId: 'identity-1',
    jobId: 'job-1'
  };
  const handler = new SaveJobCommandHandler(
    {
      async deleteByIdentityAndJobId() {},
      async findByIdentityAndJobId() {
        return existing;
      },
      async findByIdentityId() {
        return [existing];
      },
      async save() {
        throw new Error('should not create duplicate');
      }
    },
    {
      generate() {
        return 'unused';
      }
    }
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    jobId: 'job-1'
  });

  assert.equal(result.id, 'saved-job-1');
});

test('save job rejects blank job id', async () => {
  const handler = new SaveJobCommandHandler(
    {
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
    },
    {
      generate() {
        return 'unused';
      }
    }
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        jobId: '   '
      }),
    ValidationError
  );
});
