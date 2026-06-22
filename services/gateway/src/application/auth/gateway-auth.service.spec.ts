import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayAuthService } from './gateway-auth.service';

test('registerCandidate delegates the orchestration to workflow-service', async () => {
  let capturedRequest: unknown;
  let capturedRequestId: string | undefined;
  const service = new GatewayAuthService(
    {
      async registerCandidate(request: unknown, requestId?: string) {
        capturedRequest = request;
        capturedRequestId = requestId;
        return {
          email: 'candidate@example.com',
          identity_id: 'identity-1',
          role: 'candidate',
          saga_id: 'saga-1',
          status: 'COMPLETED'
        };
      },
      async registerEmployer() {
        throw new Error('unused');
      }
    } as never,
    {
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
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async resetPassword() {
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
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-candidate-1'
  });

  assert.deepEqual(capturedRequest, {
    accept_terms: true,
    email: 'candidate@example.com',
    full_name: 'Candidate User',
    password: '12345678',
    phone: '0123456789'
  });
  assert.equal(capturedRequestId, 'req-candidate-1');
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    role: 'candidate',
    userId: 'identity-1'
  });
});

test('registerEmployer delegates the orchestration to workflow-service', async () => {
  let capturedRequest: unknown;
  let capturedRequestId: string | undefined;
  const service = new GatewayAuthService(
    {
      async registerCandidate() {
        throw new Error('unused');
      },
      async registerEmployer(request: unknown, requestId?: string) {
        capturedRequest = request;
        capturedRequestId = requestId;
        return {
          email: 'employer@example.com',
          identity_id: 'identity-2',
          role: 'employer',
          saga_id: 'saga-2',
          status: 'COMPLETED'
        };
      }
    } as never,
    {
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
      async requestPasswordReset() {
        throw new Error('unused');
      },
      async resetPassword() {
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
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.registerEmployer({
    acceptTerms: true,
    address: '123 Street',
    companyEmail: 'employer@example.com',
    companyName: 'CareerHub',
    fullName: 'Employer User',
    industry: 'technology',
    password: '12345678',
    phone: '0987654321',
    requestId: 'req-employer-1'
  });

  assert.deepEqual(capturedRequest, {
    accept_terms: true,
    address: '123 Street',
    company_email: 'employer@example.com',
    company_name: 'CareerHub',
    full_name: 'Employer User',
    industry: 'technology',
    password: '12345678',
    phone: '0987654321'
  });
  assert.equal(capturedRequestId, 'req-employer-1');
  assert.deepEqual(result, {
    email: 'employer@example.com',
    role: 'employer',
    userId: 'identity-2'
  });
});

test('requestPasswordReset forwards the email and returns a generic accepted response', async () => {
  let capturedRequest: unknown;
  const service = new GatewayAuthService(
    {
      async registerCandidate() {
        throw new Error('unused');
      },
      async registerEmployer() {
        throw new Error('unused');
      }
    } as never,
    {
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
      async requestPasswordReset(request: unknown) {
        capturedRequest = request;
        return { accepted: true };
      },
      async resetPassword() {
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
        throw new Error('unused');
      }
    } as never
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
