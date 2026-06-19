import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { GatewayDashboardService } from './gateway-dashboard.service';

function createService(input: { employerProfileError?: unknown }) {
  return new GatewayDashboardService(
    {
      async getCandidateDashboardData() {
        throw new Error('unused');
      },
      async getEmployerDashboardRecruitmentData() {
        throw new Error('should not load dashboard when profile check fails');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      }
    } as never,
    {
      async listSavedJobsByIdentityId() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async listNotifications() {
        throw new Error('unused');
      }
    } as never,
    {
      async getEmployerProfileByIdentityId() {
        if (input.employerProfileError) {
          throw input.employerProfileError;
        }

        return { profile: { id: 'company-1' } };
      }
    } as never,
    {
      async getEmployerDashboardJobsSummary() {
        throw new Error('should not load dashboard when profile check fails');
      },
      async listJobsByIds() {
        throw new Error('unused');
      }
    } as never
  );
}

test('getCandidateDashboard enriches grpc data with job titles and counters', async () => {
  const service = new GatewayDashboardService(
    {
      async getCandidateDashboardData() {
        return {
          active_offers: [
            {
              application_id: 'app-1',
              currency: 'USD',
              employer_identity_id: 'employer-1',
              expires_at: '2026-06-30T00:00:00.000Z',
              id: 'offer-1',
              job_id: 'job-1',
              salary: '2000-2500',
              sent_at: '2026-06-19T09:00:00.000Z',
              status: 'SENT'
            }
          ],
          recent_applications: [
            {
              application_id: 'app-1',
              applied_at: '2026-06-18T09:00:00.000Z',
              employer_identity_id: 'employer-1',
              job_id: 'job-1',
              status: 'APPLIED',
              updated_at: '2026-06-18T10:00:00.000Z'
            }
          ],
          summary: {
            active_interviews: 1,
            active_offers: 1,
            total_applications: 3
          },
          upcoming_interviews: [
            {
              application_id: 'app-2',
              date: '2026-06-20',
              employer_identity_id: 'employer-1',
              id: 'interview-1',
              job_id: 'job-1',
              start_time: '09:30',
              status: 'SCHEDULED',
              type: 'ONLINE'
            }
          ]
        };
      }
    } as never,
    {
      async listSavedJobsByIdentityId() {
        return {
          saved_jobs: [
            { id: 'saved-1', job_id: 'job-1', saved_at: '2026-06-19T09:00:00.000Z' },
            { id: 'saved-2', job_id: 'job-2', saved_at: '2026-06-19T10:00:00.000Z' }
          ]
        };
      }
    } as never,
    {
      async listNotifications() {
        return { notifications: [], unread_count: 4 };
      }
    } as never,
    {
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async listJobsByIds() {
        return {
          items: [{ id: 'job-1', title: 'Backend Engineer' }]
        };
      }
    } as never
  );

  const dashboard = await service.getCandidateDashboard({
    identityId: 'candidate-1',
    requestId: 'req-1'
  });

  assert.equal(dashboard.summary.totalApplications, 3);
  assert.equal(dashboard.summary.activeInterviews, 1);
  assert.equal(dashboard.summary.activeOffers, 1);
  assert.equal(dashboard.summary.savedJobs, 2);
  assert.equal(dashboard.summary.unreadNotifications, 4);
  assert.equal(dashboard.recentApplications[0]?.jobTitle, 'Backend Engineer');
  assert.equal(dashboard.upcomingInterviews[0]?.jobTitle, 'Backend Engineer');
  assert.equal(dashboard.activeOffers[0]?.jobTitle, 'Backend Engineer');
});

test('getEmployerDashboard maps missing employer profile to COMPANY_PROFILE_NOT_FOUND', async () => {
  const service = createService({
    employerProfileError: new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Employer profile not found for identity: employer-1'
    })
  });

  await assert.rejects(
    () => service.getEmployerDashboard({ identityId: 'employer-1' }),
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

test('getEmployerDashboard bubbles upstream infrastructure errors from employer-service', async () => {
  const upstreamError = new InternalServerErrorException({
    code: 'INTERNAL',
    message: 'Employer service unavailable'
  });
  const service = createService({ employerProfileError: upstreamError });

  await assert.rejects(
    () => service.getEmployerDashboard({ identityId: 'employer-1' }),
    (error: unknown) => error === upstreamError
  );
});
