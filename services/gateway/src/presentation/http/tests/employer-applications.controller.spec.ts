import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerApplicationsController } from '../applications/employer-applications.controller';

test('employer applications controller updates status and loads ats board', async () => {
  const calls: string[] = [];
  const controller = new EmployerApplicationsController({
    async getApplicationHistory() {
      throw new Error('unused');
    },
    async getAtsBoard() {
      calls.push('ats');
      return {
        applications: [],
        job: {
          city: null,
          country: null,
          currency: null,
          id: 0,
          isRemote: false,
          salaryMax: null,
          salaryMin: null,
          status: 'published',
          title: 'Backend Dev'
        }
      };
    },
    async getEmployerApplication() {
      throw new Error('unused');
    },
    async listJobApplications() {
      return {
        items: [],
        meta: { page: 1, pageSize: 20, total: 0 }
      };
    },
    async updateApplicationStatus() {
      calls.push('update');
      return {
        appliedAt: '2026-06-12T00:00:00.000Z',
        candidateUserId: 'candidate-1',
        coverLetter: null,
        id: 'application-1',
        jobId: 'job-1',
        resumeId: 'resume-1',
        status: 'reviewed',
        updatedAt: '2026-06-13T00:00:00.000Z'
      };
    }
  } as never);

  const user = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };

  const updated = await controller.updateApplicationStatus(
    user,
    'application-1',
    { note: 'Move in ATS', status: 'reviewed' },
    'req-1'
  );
  const ats = await controller.getAtsBoard(user, 'job-1', { page: 1, pageSize: 100 }, 'req-2');

  assert.equal(updated.data.status, 'reviewed');
  assert.equal(ats.data.job.title, 'Backend Dev');
  assert.deepEqual(calls, ['update', 'ats']);
});
