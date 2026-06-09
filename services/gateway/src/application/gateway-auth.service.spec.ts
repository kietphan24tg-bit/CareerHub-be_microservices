import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayAuthService } from './gateway-auth.service';

test('registerCandidate orchestrates IAM, candidate profile creation, and activation', async () => {
  const calls: string[] = [];
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-1',
          status: 'active'
        };
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
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      }
    } as never
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
});

test('registerEmployer stops when employer profile creation fails', async () => {
  const calls: string[] = [];
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-2',
          status: 'active'
        };
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
      }
    } as never,
    {
      async createEmployerProfile() {
        calls.push('employer.createProfile');
        throw new Error('employer profile create failed');
      }
    } as never
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

  assert.deepEqual(calls, ['iam.register', 'employer.createProfile']);
});

test('requestPasswordReset forwards the email and returns a generic accepted response', async () => {
  let capturedRequest: unknown;
  const service = new GatewayAuthService(
    {
      async activateIdentity() {
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
    {} as never,
    {} as never
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
