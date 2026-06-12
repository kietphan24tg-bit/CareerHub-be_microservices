import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicJobsController } from '../jobs/public-jobs.controller';

test('public jobs controller lists and loads job detail', async () => {
  const controller = new PublicJobsController({
    async listPublicJobs() {
      return {
        items: [{ id: 'job-1', slug: 'senior-dev', status: 'published', title: 'Senior Dev' }],
        meta: { page: 1, pageSize: 20, total: 1 }
      };
    },
    async getPublicJobBySlug() {
      return { id: 'job-1', slug: 'senior-dev', status: 'published', title: 'Senior Dev' };
    }
  } as never);

  const list = await controller.listPublicJobs({ page: 1, pageSize: 20, sort: 'newest' } as never, 'req-1');
  assert.equal(list.data.items[0]?.slug, 'senior-dev');

  const detail = await controller.getPublicJob('senior-dev', 'req-2');
  assert.equal(detail.data.title, 'Senior Dev');
});