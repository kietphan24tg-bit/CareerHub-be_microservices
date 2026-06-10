import assert from 'node:assert/strict';
import test from 'node:test';
import type { MetricsRegistry } from '@careerhub/infrastructure';
import { GatewayAuthService } from './gateway-auth.service';

function createMetricsRegistry() {
  const registerCompensationRecords: Array<Record<string, unknown>> = [];

  return {
    metrics: {
      recordHttpError() {},
      recordHttpRequest() {},
      recordIntegrationConsumer() {},
      recordOutboxBacklog() {},
      recordOutboxCleanup() {},
      recordOutboxPublish() {},
      recordRegisterCompensation(record) {
        registerCompensationRecords.push(record);
      },
      recordRmqError() {},
      recordRmqRequest() {},
      recordRpcError() {},
      recordRpcRequest() {},
      renderPrometheus() {
        return '';
      }
    } satisfies MetricsRegistry,
    registerCompensationRecords
  };
}

test('registerCandidate orchestrates IAM, candidate profile creation, and activation', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-1',
          status: 'active'
        };
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return { cancelled: true };
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-1',
          role: 'candidate',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-1',
          profile_id: 'candidate-profile-1'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return { compensated: true };
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  const result = await service.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Test Candidate',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-1'
  });

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate'
  ]);
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    role: 'candidate',
    userId: 'identity-1'
  });
  assert.deepEqual(metricsRegistry.registerCompensationRecords, []);
});

test('registerEmployer compensates identity when employer profile creation fails', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-2',
          status: 'active'
        };
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return { cancelled: true };
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'employer@example.com',
          identity_id: 'identity-2',
          role: 'employer',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        calls.push('employer.createProfile');
        throw new Error('employer profile create failed');
      },
      async deleteEmployerProfileCompensation() {
        calls.push('employer.deleteCompensation');
        return { compensated: true };
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('profile missing');
      }
    } as never,
    metricsRegistry.metrics
  );

  await assert.rejects(
    () =>
      service.registerEmployer({
        acceptTerms: true,
        address: '123 Street',
        companyEmail: 'employer@example.com',
        companyName: 'CareerHub',
        fullName: 'Employer User',
        industry: 'technology',
        password: '12345678',
        phone: '0987654321',
        requestId: 'req-2'
      }),
    /employer profile create failed/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'employer.createProfile',
    'iam.cancelPending'
  ]);
  assert.deepEqual(metricsRegistry.registerCompensationRecords, [
    {
      action: 'cancel_pending_identity',
      flow: 'employer',
      reason: 'profile_creation_failed',
      service: 'gateway',
      status: 'performed'
    }
  ]);
});

test('registerCandidate compensates profile and identity when activation fails', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activate failed');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return { cancelled: true };
      },
      async getCurrentIdentity() {
        throw new Error('identity not active');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-3',
          role: 'candidate',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-3',
          profile_id: 'candidate-profile-3'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return { compensated: true };
      },
      async getCandidateProfileByIdentityId() {
        return {
          profile: {} as never
        };
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  await assert.rejects(
    () =>
      service.registerCandidate({
        acceptTerms: true,
        email: 'candidate@example.com',
        fullName: 'Test Candidate',
        password: '12345678',
        phone: '0123456789',
        requestId: 'req-3'
      }),
    /activate failed/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'candidate.deleteCompensation',
    'iam.cancelPending'
  ]);
  assert.deepEqual(metricsRegistry.registerCompensationRecords, [
    {
      action: 'delete_profile',
      flow: 'candidate',
      reason: 'activation_failed',
      service: 'gateway',
      status: 'performed'
    },
    {
      action: 'cancel_pending_identity',
      flow: 'candidate',
      reason: 'activation_failed',
      service: 'gateway',
      status: 'performed'
    }
  ]);
});

test('registerCandidate continues when profile create fails but profile actually exists', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-4',
          status: 'active'
        };
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return { cancelled: true };
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-4',
          role: 'candidate',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        throw new Error('candidate profile create failed');
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return { compensated: true };
      },
      async getCandidateProfileByIdentityId() {
        calls.push('candidate.getProfile');
        return {
          profile: {} as never
        };
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  const result = await service.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Test Candidate',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-4'
  });

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'candidate.getProfile',
    'iam.activate'
  ]);
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    role: 'candidate',
    userId: 'identity-4'
  });
  assert.deepEqual(metricsRegistry.registerCompensationRecords, [
    {
      action: 'skip_profile_exists',
      flow: 'candidate',
      reason: 'profile_creation_failed',
      service: 'gateway',
      status: 'skipped'
    }
  ]);
});

test('registerCandidate continues when activation fails but identity is already active', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activate failed');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return { cancelled: true };
      },
      async getCurrentIdentity() {
        calls.push('iam.getCurrentIdentity');
        return {
          email: 'candidate@example.com',
          identity_id: 'identity-5',
          role: 'candidate',
          status: 'active'
        };
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-5',
          role: 'candidate',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-5',
          profile_id: 'candidate-profile-5'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return { compensated: true };
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  const result = await service.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Test Candidate',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-5'
  });

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'iam.getCurrentIdentity'
  ]);
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    role: 'candidate',
    userId: 'identity-5'
  });
  assert.deepEqual(metricsRegistry.registerCompensationRecords, [
    {
      action: 'skip_already_active',
      flow: 'candidate',
      reason: 'activation_failed',
      service: 'gateway',
      status: 'skipped'
    }
  ]);
});

test('registerCandidate keeps original activation error when compensation calls also fail', async () => {
  const calls: string[] = [];
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activate failed');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        throw new Error('cancel pending failed');
      },
      async getCurrentIdentity() {
        throw new Error('identity not active');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-05T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-6',
          role: 'candidate',
          status: 'pending_profile'
        };
      },
      async validateAccessToken() {
        throw new Error('unused');
      },
      async resetPassword() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-6',
          profile_id: 'candidate-profile-6'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        throw new Error('delete profile failed');
      },
      async getCandidateProfileByIdentityId() {
        return {
          profile: {} as never
        };
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  await assert.rejects(
    () =>
      service.registerCandidate({
        acceptTerms: true,
        email: 'candidate@example.com',
        fullName: 'Test Candidate',
        password: '12345678',
        phone: '0123456789',
        requestId: 'req-6'
      }),
    /activate failed/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'candidate.deleteCompensation',
    'iam.cancelPending'
  ]);
  assert.deepEqual(metricsRegistry.registerCompensationRecords, [
    {
      action: 'delete_profile',
      flow: 'candidate',
      reason: 'activation_failed',
      service: 'gateway',
      status: 'failed'
    },
    {
      action: 'cancel_pending_identity',
      flow: 'candidate',
      reason: 'activation_failed',
      service: 'gateway',
      status: 'failed'
    }
  ]);
});

test('requestPasswordReset forwards the email and returns a generic accepted response', async () => {
  let capturedRequest: unknown;
  const metricsRegistry = createMetricsRegistry();
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        throw new Error('unused');
      },
      async cancelPendingIdentity() {
        throw new Error('unused');
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async loginIdentity() {
        throw new Error('unused');
      },
      async logoutSession() {
        throw new Error('unused');
      },
      async refreshSession() {
        throw new Error('unused');
      },
      async registerIdentity() {
        throw new Error('unused');
      },
      async requestPasswordReset(request: unknown) {
        capturedRequest = request;
        return { accepted: true };
      },
      async resetPassword() {
        throw new Error('unused');
      },
      async validateAccessToken() {
        throw new Error('unused');
      }
    } as never,
    {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    } as never,
    metricsRegistry.metrics
  );

  const result = await service.requestPasswordReset({
    email: 'candidate@example.com',
    requestId: 'req-reset-1'
  });

  assert.deepEqual(capturedRequest, {
    email: 'candidate@example.com'
  });
  assert.deepEqual(result, {
    accepted: true
  });
});
