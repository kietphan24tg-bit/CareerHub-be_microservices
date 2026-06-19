import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateDashboardController } from '../dashboard/candidate-dashboard.controller';

const DASHBOARD_DATA = {
  activeOffers: [],
  recentApplications: [],
  summary: {
    activeInterviews: 1,
    activeOffers: 2,
    savedJobs: 3,
    totalApplications: 4,
    unreadNotifications: 5
  },
  upcomingInterviews: []
};

const USER = { email: 'candidate@example.com', id: 'candidate-1', role: 'candidate' as const };

test('getCandidateDashboard returns dashboard data', async () => {
  const controller = new CandidateDashboardController({
    async getCandidateDashboard(input: { identityId: string; requestId?: string }) {
      assert.equal(input.identityId, 'candidate-1');
      assert.equal(input.requestId, 'req-1');
      return DASHBOARD_DATA;
    }
  } as never);

  const response = await controller.getCandidateDashboard(USER, 'req-1');

  assert.equal(response.data.summary.totalApplications, 4);
  assert.equal(response.data.summary.savedJobs, 3);
  assert.equal(response.data.summary.unreadNotifications, 5);
  assert.equal(response.message, 'Candidate dashboard loaded successfully');
});
