import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewaySavedJobsService } from './gateway-saved-jobs.service';

test('list saved jobs keeps backward-compatible payload without enrichment', async () => {
  const service = new GatewaySavedJobsService(
    {
      async listSavedJobsByIdentityId() {
        return {
          saved_jobs: [
            {
              id: 'saved-job-1',
              identity_id: 'identity-1',
              job_id: 'job-1',
              saved_at: '2026-06-11T00:00:00.000Z'
            }
          ]
        };
      }
    } as never,
    {
      async findByIds(jobIds: string[]) {
        return new Map(jobIds.map((jobId) => [jobId, null]));
      }
    }
  );

  const result = await service.listSavedJobs({
    identityId: 'identity-1'
  });

  assert.deepEqual(result, [
    {
      id: 'saved-job-1',
      jobId: 'job-1',
      savedAt: '2026-06-11T00:00:00.000Z'
    }
  ]);
});

test('list saved jobs enriches job details when lookup adapter returns data', async () => {
  const service = new GatewaySavedJobsService(
    {
      async listSavedJobsByIdentityId() {
        return {
          saved_jobs: [
            {
              id: 'saved-job-1',
              identity_id: 'identity-1',
              job_id: 'job-1',
              saved_at: '2026-06-11T00:00:00.000Z'
            }
          ]
        };
      }
    } as never,
    {
      async findByIds(jobIds: string[]) {
        return new Map(
          jobIds.map((jobId) => [
            jobId,
            {
              id: jobId,
              title: 'Backend Engineer'
            }
          ])
        );
      }
    }
  );

  const result = await service.listSavedJobs({
    identityId: 'identity-1'
  });

  assert.deepEqual(result, [
    {
      id: 'saved-job-1',
      jobId: 'job-1',
      savedAt: '2026-06-11T00:00:00.000Z',
      job: {
        id: 'job-1',
        title: 'Backend Engineer'
      }
    }
  ]);
});