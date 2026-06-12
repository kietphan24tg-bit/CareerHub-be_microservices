import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerJobsController } from '../jobs/employer-jobs.controller';

test('employer jobs controller creates and publishes jobs', async () => {
  const calls: string[] = [];
  const controller = new EmployerJobsController({
    async createEmployerJob() {
      calls.push('create');
      return { id: 'job-1', status: 'draft', title: 'Senior Dev' };
    },
    async publishEmployerJob() {
      calls.push('publish');
      return { id: 'job-1', status: 'published', title: 'Senior Dev' };
    },
    async listEmployerJobs() {
      return { items: [], meta: { page: 1, pageSize: 20, total: 0 } };
    },
    async getEmployerJob() {
      throw new Error('unused');
    },
    async updateEmployerJob() {
      throw new Error('unused');
    },
    async closeEmployerJob() {
      throw new Error('unused');
    },
    async archiveEmployerJob() {
      throw new Error('unused');
    },
    async reopenEmployerJob() {
      throw new Error('unused');
    }
  } as never);

  const user = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };

  const created = await controller.createEmployerJob(user, { title: 'Senior Dev' } as never, 'req-1');
  assert.equal(created.data.status, 'draft');

  const published = await controller.publishEmployerJob(user, 'job-1', 'req-2');
  assert.equal(published.data.status, 'published');
  assert.deepEqual(calls, ['create', 'publish']);
});