import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { EmployerDashboardController } from '../dashboard/employer-dashboard.controller';

const DASHBOARD_DATA = {
  interviewsToday: [],
  pipeline: [],
  priorityJobs: [],
  recentActivities: [],
  summary: { activeJobs: 2, interviewsToday: 0, offersOpen: 1, totalApplicants: 5 }
};

const USER = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };

test('getEmployerDashboard returns dashboard data', async () => {
  const controller = new EmployerDashboardController({
    async getEmployerDashboard(input: { identityId: string }) {
      assert.equal(input.identityId, 'employer-1');
      return DASHBOARD_DATA;
    }
  } as never);

  const response = await controller.getEmployerDashboard(USER, 'req-1');

  assert.equal(response.data.summary.activeJobs, 2);
  assert.equal(response.data.summary.totalApplicants, 5);
  assert.equal(response.data.summary.offersOpen, 1);
  assert.deepEqual(response.data.pipeline, []);
  assert.equal(response.message, 'Employer dashboard loaded successfully');
});

test('getEmployerDashboard re-throws NotFoundException from service', async () => {
  const controller = new EmployerDashboardController({
    async getEmployerDashboard() {
      throw new NotFoundException({
        code: 'COMPANY_PROFILE_NOT_FOUND',
        message: 'Company profile not found.'
      });
    }
  } as never);

  await assert.rejects(
    () => controller.getEmployerDashboard(USER, 'req-1'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      assert.deepEqual(error.getResponse(), {
        code: 'COMPANY_PROFILE_NOT_FOUND',
        message: 'Company profile not found.'
      });
      return true;
    }
  );
});
