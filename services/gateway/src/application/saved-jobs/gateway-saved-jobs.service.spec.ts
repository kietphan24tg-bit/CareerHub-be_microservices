import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { GatewaySavedJobsService } from './gateway-saved-jobs.service';

const candidateClient = {
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
  },
  async saveJob() {
    return {
      saved_job: {
        id: 'saved-job-1',
        identity_id: 'identity-1',
        job_id: 'job-1',
        saved_at: '2026-06-11T00:00:00.000Z'
      }
    };
  },
  async removeSavedJob() {
    return undefined;
  }
} as never;

const jobClient = {
  async jobExists(request: { job_id: string }) {
    return { exists: request.job_id === 'job-1' };
  }
} as never;

test('list saved jobs keeps backward-compatible payload without enrichment', async () => {
  const service = new GatewaySavedJobsService(candidateClient, jobClient, {
    async findByIds(jobIds: string[]) {
      return new Map(jobIds.map((jobId) => [jobId, null]));
    }
  });

  const result = await service.listSavedJobs({ identityId: 'identity-1' });

  assert.deepEqual(result, [
    {
      id: 'saved-job-1',
      jobId: 'job-1',
      savedAt: '2026-06-11T00:00:00.000Z'
    }
  ]);
});

test('list saved jobs enriches job details when lookup adapter returns data', async () => {
  const service = new GatewaySavedJobsService(candidateClient, jobClient, {
    async findByIds(jobIds: string[]) {
      return new Map(
        jobIds.map((jobId) => [
          jobId,
          {
            city: 'HCMC',
            companyLogoUrl: null,
            companyName: 'CareerHub Co',
            country: 'Vietnam',
            currency: 'VND',
            employmentType: 'fulltime',
            expiresAt: null,
            id: jobId,
            isRemote: false,
            level: 'senior',
            salaryMax: 2000,
            salaryMin: 1000,
            slug: 'backend-engineer',
            status: 'published',
            title: 'Backend Engineer'
          }
        ])
      );
    }
  });

  const result = await service.listSavedJobs({ identityId: 'identity-1' });

  assert.equal(result[0]?.job?.title, 'Backend Engineer');
  assert.equal(result[0]?.job?.slug, 'backend-engineer');
});

test('save job validates job existence before saving', async () => {
  const service = new GatewaySavedJobsService(candidateClient, jobClient, {
    async findByIds() {
      return new Map();
    }
  });

  await assert.rejects(
    () =>
      service.saveJob({
        identityId: 'identity-1',
        jobId: 'missing-job'
      }),
    NotFoundException
  );
});