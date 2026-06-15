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
      async getEmployerDashboardRecruitmentData() {
        throw new Error('should not load dashboard when profile check fails');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      }
    } as never,
    {
      async getCandidateProfileByIdentityId() {
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
