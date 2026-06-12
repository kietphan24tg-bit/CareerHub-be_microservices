import assert from 'node:assert/strict';
import test from 'node:test';
import { SavedJobsController } from '../saved-jobs/saved-jobs.controller';

test('saved jobs controller lists saved jobs', async () => {
  const controller = new SavedJobsController({
    async listSavedJobs() {
      return [
        {
          id: 'saved-job-1',
          jobId: 'job-1',
          savedAt: '2026-06-11T00:00:00.000Z'
        }
      ];
    },
    async removeSavedJob() {
      throw new Error('unused');
    },
    async saveJob() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.listSavedJobs(
    {
      email: 'candidate@example.com',
      id: 'identity-1',
      role: 'candidate'
    },
    'req-1'
  );

  assert.equal(response.data.length, 1);
  assert.equal(response.data[0]?.jobId, 'job-1');
});

test('saved jobs controller saves and removes saved jobs', async () => {
  const controller = new SavedJobsController({
    async listSavedJobs() {
      return [];
    },
    async removeSavedJob(input: { jobId: string }) {
      return input.jobId;
    },
    async saveJob(input: { jobId: string }) {
      return {
        id: 'saved-job-2',
        jobId: input.jobId,
        savedAt: '2026-06-12T00:00:00.000Z'
      };
    }
  } as never);

  const saved = await controller.saveJob(
    {
      email: 'candidate@example.com',
      id: 'identity-1',
      role: 'candidate'
    },
    {
      jobId: 'job-2'
    },
    'req-2'
  );
  const removed = await controller.removeSavedJob(
    {
      email: 'candidate@example.com',
      id: 'identity-1',
      role: 'candidate'
    },
    'job-2',
    'req-3'
  );

  assert.equal(saved.data.jobId, 'job-2');
  assert.equal(removed.message, 'Bỏ lưu job thành công.');
});
