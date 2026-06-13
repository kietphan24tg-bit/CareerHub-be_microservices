import assert from 'node:assert/strict';
import test from 'node:test';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import { GetJobForApplicationQueryHandler } from './get-job-for-application.query-handler';

test('get job for application returns job by id', async () => {
  const handler = new GetJobForApplicationQueryHandler({
    async findById(jobId: string) {
      return {
        applicationCount: 0,
        benefits: [],
        category: null,
        city: null,
        companyId: 'company-1',
        companyIndustry: null,
        companyLogoUrl: null,
        companyName: 'CareerHub Co',
        companyWebsite: null,
        country: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        currency: null,
        description: null,
        employerIdentityId: 'employer-1',
        employmentType: null,
        expiresAt: null,
        id: jobId,
        isRemote: false,
        level: null,
        requirements: [],
        responsibilities: [],
        salaryMax: null,
        salaryMin: null,
        slug: 'senior-dev',
        status: 'published',
        title: 'Senior Dev',
        updatedAt: new Date('2026-01-02T00:00:00.000Z')
      };
    }
  } as never);

  const result = await handler.execute({ jobId: 'job-1' });

  assert.equal(result.id, 'job-1');
  assert.equal(result.employerIdentityId, 'employer-1');
});

test('get job for application throws when missing', async () => {
  const handler = new GetJobForApplicationQueryHandler({
    async findById() {
      return null;
    }
  } as never);

  await assert.rejects(
    () => handler.execute({ jobId: 'job-missing' }),
    (error: unknown) => error instanceof JobNotFoundError
  );
});
