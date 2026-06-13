import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateApplicationsController } from '../applications/candidate-applications.controller';

test('candidate applications controller submits and withdraws applications', async () => {
  const calls: string[] = [];
  const controller = new CandidateApplicationsController({
    async applyToJob() {
      calls.push('apply');
      return {
        appliedAt: '2026-06-12T00:00:00.000Z',
        candidateUserId: 'candidate-1',
        coverLetter: null,
        id: 'application-1',
        jobId: 'job-1',
        resumeId: 'resume-1',
        status: 'applied',
        updatedAt: '2026-06-12T00:00:00.000Z'
      };
    },
    async getCandidateApplication() {
      throw new Error('unused');
    },
    async listCandidateApplications() {
      return {
        items: [],
        meta: { page: 1, pageSize: 20, total: 0 }
      };
    },
    async withdrawApplication() {
      calls.push('withdraw');
      return {
        appliedAt: '2026-06-12T00:00:00.000Z',
        candidateUserId: 'candidate-1',
        coverLetter: null,
        id: 'application-1',
        jobId: 'job-1',
        resumeId: 'resume-1',
        status: 'withdrawn',
        updatedAt: '2026-06-13T00:00:00.000Z'
      };
    }
  } as never);

  const user = { email: 'candidate@example.com', id: 'candidate-1', role: 'candidate' as const };

  const applied = await controller.applyToJob(
    user,
    'job-1',
    { coverLetter: 'Hi', resumeId: 'resume-1' },
    'req-1'
  );
  const withdrawn = await controller.withdrawApplication(user, 'application-1', 'req-2');

  assert.equal(applied.data.status, 'applied');
  assert.equal(withdrawn.data.status, 'withdrawn');
  assert.deepEqual(calls, ['apply', 'withdraw']);
});
