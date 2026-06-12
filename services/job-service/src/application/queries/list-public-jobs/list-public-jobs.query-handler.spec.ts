import assert from 'node:assert/strict';
import test from 'node:test';
import { ListPublicJobsQueryHandler } from './list-public-jobs.query-handler';

test('list public jobs returns paginated published jobs', async () => {
  const handler = new ListPublicJobsQueryHandler({
    async listPublic() {
      return {
        items: [
          {
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
            status: 'published',
            title: 'Senior Dev',
            updatedAt: new Date('2026-01-02T00:00:00.000Z')
          }
        ],
        total: 1
      };
    }
  } as never);

  const result = await handler.execute({
    page: 1,
    pageSize: 20,
    sort: 'newest'
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.meta.total, 1);
  assert.equal(result.meta.pageSize, 20);
});