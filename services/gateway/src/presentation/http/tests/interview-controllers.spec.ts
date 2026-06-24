import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateInterviewsController } from '../interviews/candidate-interviews.controller';
import { EmployerInterviewsController } from '../interviews/employer-interviews.controller';

const user = { email: 'user@example.com', id: 'user-1', role: 'employer' as const };
const candidateUser = { email: 'candidate@example.com', id: 'candidate-1', role: 'candidate' as const };

test('employer interviews controller returns response envelope for list and create', async () => {
  const calls: string[] = [];
  const controller = new EmployerInterviewsController({
    async listEmployerInterviews() {
      calls.push('list');
      return {
        items: [{ id: 'interview-1', status: 'scheduled' }],
        meta: { page: 1, pageSize: 20, total: 1 }
      };
    },
    async createInterview() {
      calls.push('create');
      return { id: 'interview-1', status: 'scheduled' };
    },
    async updateInterview() {
      throw new Error('unused');
    },
    async cancelInterview() {
      throw new Error('unused');
    }
  } as never);

  const listed = await controller.listEmployerInterviews(user, {}, 'req-1');
  const created = await controller.createInterview(
    user,
    'application-1',
    {
      date: '2026-06-20',
      durationMinutes: 60,
      round: 'Technical',
      startTime: '10:00',
      type: 'online'
    },
    'req-2'
  );

  assert.equal(listed.message, 'Employer interviews loaded successfully');
  assert.equal(listed.data.items[0]?.id, 'interview-1');
  assert.equal(created.message, 'Interview created successfully');
  assert.equal(created.data.id, 'interview-1');
  assert.deepEqual(calls, ['list', 'create']);
});

test('candidate interviews controller returns response envelope for confirm and decline', async () => {
  const calls: string[] = [];
  const controller = new CandidateInterviewsController({
    async getCandidateInterview() {
      throw new Error('unused');
    },
    async confirmInterview() {
      calls.push('confirm');
      return { id: 'interview-1', status: 'confirmed' };
    },
    async declineInterview() {
      calls.push('decline');
      return { id: 'interview-1', status: 'cancelled' };
    },
    async requestReschedule() {
      throw new Error('unused');
    }
  } as never);

  const confirmed = await controller.confirmInterview(candidateUser, 'interview-1', {}, 'req-1');
  const declined = await controller.declineInterview(candidateUser, 'interview-1', {}, 'req-2');

  assert.equal(confirmed.message, 'Interview confirmed successfully');
  assert.equal(confirmed.data.status, 'confirmed');
  assert.equal(declined.message, 'Interview declined successfully');
  assert.equal(declined.data.status, 'cancelled');
  assert.deepEqual(calls, ['confirm', 'decline']);
});
