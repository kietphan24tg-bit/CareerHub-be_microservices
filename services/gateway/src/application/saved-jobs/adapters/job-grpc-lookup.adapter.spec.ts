import assert from 'node:assert/strict';
import test from 'node:test';
import { JobGrpcLookupAdapter } from './job-grpc-lookup.adapter';

test('job grpc lookup adapter maps summaries by id', async () => {
  const adapter = new JobGrpcLookupAdapter({
    async listJobsByIds() {
      return {
        items: [
          {
            city: 'HCMC',
            company_id: 'company-1',
            company_logo_url: '',
            company_name: 'CareerHub Co',
            country: 'Vietnam',
            currency: 'VND',
            employment_type: 'fulltime',
            expires_at: '',
            id: 'job-1',
            is_remote: false,
            level: 'senior',
            null_fields: [],
            salary_max: 2000,
            salary_min: 1000,
            slug: 'senior-dev',
            status: 'published',
            title: 'Senior Dev'
          }
        ]
      };
    }
  } as never);

  const lookup = await adapter.findByIds(['job-1', 'job-2']);

  assert.equal(lookup.get('job-1')?.title, 'Senior Dev');
  assert.equal(lookup.get('job-2'), null);
});