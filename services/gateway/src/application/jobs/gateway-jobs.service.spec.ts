import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayJobsService } from './gateway-jobs.service';

test('list public jobs maps grpc response to http shape', async () => {
  const service = new GatewayJobsService(
    {
      async listPublicJobs() {
        return {
          items: [
            {
              application_count: 0,
              benefits: ['Health insurance'],
              category: 'Engineering',
              city: 'HCMC',
              company: {
                company_name: 'CareerHub Co',
                id: 'company-1',
                industry: 'Tech',
                logo_url: '',
                website: ''
              },
              company_id: 'company-1',
              country: 'Vietnam',
              created_at: '2026-01-01T00:00:00.000Z',
              currency: 'VND',
              description: 'Description',
              employment_type: 'fulltime',
              expires_at: '',
              id: 'job-1',
              is_remote: false,
              level: 'senior',
              null_fields: [],
              requirements: [],
              responsibilities: [],
              salary_max: 2000,
              salary_min: 1000,
              slug: 'senior-dev',
              status: 'published',
              title: 'Senior Dev',
              updated_at: '2026-01-02T00:00:00.000Z'
            }
          ],
          meta: { page: 1, page_size: 20, total: 1 }
        };
      }
    } as never,
    {
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.listPublicJobs({ page: 1, pageSize: 20 });

  assert.equal(result.items[0]?.title, 'Senior Dev');
  assert.equal(result.meta?.total, 1);
  assert.equal(result.meta?.pageSize, 20);
});