import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidJobStatusTransitionError } from '../../../domain';
import { PublishJobCommandHandler } from './publish-job.command-handler';

const publishedJob = {
  applicationCount: 0,
  benefits: [],
  category: 'Engineering',
  city: 'HCMC',
  companyId: 'company-1',
  companyIndustry: 'Tech',
  companyLogoUrl: null,
  companyName: 'CareerHub Co',
  companyWebsite: null,
  country: 'Vietnam',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  currency: 'VND',
  description: 'Description',
  employerIdentityId: 'employer-1',
  employmentType: 'fulltime',
  expiresAt: null,
  id: 'job-1',
  isRemote: false,
  level: 'senior',
  requirements: [],
  responsibilities: [],
  salaryMax: 2000,
  salaryMin: 1000,
  slug: 'senior-dev',
  status: 'published' as const,
  title: 'Senior Dev',
  updatedAt: new Date('2026-01-02T00:00:00.000Z')
};

test('publish job transitions draft to published', async () => {
  const handler = new PublishJobCommandHandler({
    async findByIdAndEmployer() {
      return { ...publishedJob, status: 'draft' };
    },
    async saveStatus() {
      return publishedJob;
    }
  } as never);

  const result = await handler.execute({
    employerIdentityId: 'employer-1',
    jobId: 'job-1'
  });

  assert.equal(result.status, 'published');
});

test('publish job rejects invalid transition', async () => {
  const handler = new PublishJobCommandHandler({
    async findByIdAndEmployer() {
      return { ...publishedJob, status: 'archived' as const };
    }
  } as never);

  await assert.rejects(
    () =>
      handler.execute({
        employerIdentityId: 'employer-1',
        jobId: 'job-1'
      }),
    InvalidJobStatusTransitionError
  );
});
