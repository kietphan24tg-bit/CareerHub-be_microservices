import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from '../auth/auth.controller';

let capturedCandidateRequestId: string | undefined;

const gatewayAuthService = {
  async registerCandidate(input: unknown) {
    capturedCandidateRequestId = (input as { requestId?: string }).requestId;
    return {
      ...(input as Record<string, unknown>),
      role: 'candidate',
      userId: 'identity-1'
    };
  },
  async registerEmployer(input: unknown) {
    return {
      ...(input as Record<string, unknown>),
      role: 'employer',
      userId: 'identity-2'
    };
  },
  async requestPasswordReset() {
    return {
      accepted: true
    };
  },
  async resetPassword() {
    return {
      passwordReset: true
    };
  }
};

const gatewayRuntimeConfig = {
  authRefreshCookieDomain: undefined,
  authRefreshCookieName: 'refresh_token',
  authRefreshCookieSecure: false,
  grpcApplicationUrl: '127.0.0.1:50055',
  grpcCandidateUrl: '127.0.0.1:50052',
  grpcCommunicationUrl: '127.0.0.1:50056',
  grpcEmployerUrl: '127.0.0.1:50053',
  grpcIamUrl: '127.0.0.1:50051',
  grpcJobUrl: '127.0.0.1:50054',
  grpcWorkflowUrl: '127.0.0.1:50057',
  jwtRefreshExpiresIn: '7d',
  throttleMediumLimit: 100,
  throttleMediumTtlMs: 60_000,
  throttleShortLimit: 10,
  throttleShortTtlMs: 1_000
};

test('registerCandidate throws when password confirmation does not match', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );

  await assert.rejects(
    () =>
      controller.registerCandidate({
        acceptTerms: true,
        confirmPassword: '12345679',
        email: 'user@example.com',
        fullName: 'Test User',
        password: '12345678',
        phone: '01234567'
      }, { headers: {} }),
    (error: unknown) =>
      error instanceof BadRequestException &&
      JSON.stringify(error.getResponse()).includes(
        'Password confirmation does not match password'
      )
  );
});

test('registerCandidate forwards payload when password confirmation matches', async () => {
  capturedCandidateRequestId = undefined;
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );

  const response = await controller.registerCandidate({
    acceptTerms: true,
    confirmPassword: '12345678',
    email: 'user@example.com',
    fullName: 'Test User',
    password: '12345678',
    phone: '01234567'
  }, { headers: {} });

  assert.equal(response.message, 'Candidate registered successfully');
  assert.equal(response.data.role, 'candidate');
  assert.equal(typeof capturedCandidateRequestId, 'string');

  if (typeof capturedCandidateRequestId !== 'string') {
    throw new Error('Expected controller to forward a generated requestId');
  }

  assert.ok(String(capturedCandidateRequestId).length > 0);
});

test('requestPasswordReset returns a generic success payload', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );

  const response = await controller.requestPasswordReset({
    email: 'user@example.com'
  });

  assert.equal(response.data.accepted, true);
});

test('resetPassword returns a success payload', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );

  const response = await controller.resetPassword({
    newPassword: 'new-password-1',
    token: 'reset-token-raw'
  });

  assert.equal(response.data.passwordReset, true);
});
