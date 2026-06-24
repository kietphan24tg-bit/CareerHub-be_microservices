import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../auth/auth.controller';

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
  value?: string;
};

type CookieResponseMock = {
  clearCookieCalls: CookieCall[];
  cookieCalls: CookieCall[];
  clearCookie: (name: string, options: Record<string, unknown>) => void;
  cookie: (
    name: string,
    value: string,
    options: Record<string, unknown>
  ) => void;
};

function createCookieResponseMock(): CookieResponseMock {
  return {
    clearCookie(name, options) {
      this.clearCookieCalls.push({ name, options });
    },
    clearCookieCalls: [],
    cookie(name, value, options) {
      this.cookieCalls.push({ name, options, value });
    },
    cookieCalls: []
  };
}

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

const gatewayAuthService = {
  async getCurrentUser(input: { identityId: string }) {
    return {
      companyProfile: null,
      profile: {
        address: null,
        avatarUrl: null,
        bio: null,
        createdAt: '2026-06-01T00:00:00.000Z',
        fullName: 'Candidate Flow',
        githubUrl: null,
        headline: null,
        id: 'profile-1',
        linkedinUrl: null,
        phone: null,
        portfolioUrl: null,
        resumeId: null,
        updatedAt: '2026-06-01T00:00:00.000Z',
        userId: input.identityId,
        yearsExperience: null
      },
      user: {
        email: 'candidate@example.com',
        role: 'candidate',
        userId: input.identityId
      }
    };
  },
  async login(input: { email: string }) {
    return {
      accessToken: `access-token:${input.email}`,
      refreshToken: 'refresh-token-1',
      user: {
        email: input.email,
        id: 'identity-flow-1',
        role: 'candidate'
      }
    };
  },
  async logout(input: { refreshToken: string }) {
    return {
      loggedOut: input.refreshToken.length > 0
    };
  },
  async refresh(input: { refreshToken: string }) {
    return {
      accessToken: `access-token-refreshed:${input.refreshToken}`,
      rememberMe: false,
      refreshToken: 'refresh-token-2',
      user: {
        email: 'candidate@example.com',
        id: 'identity-flow-1',
        role: 'candidate'
      }
    };
  }
};

test('login sets refresh cookie and returns access token payload', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );
  const response = createCookieResponseMock();

  const result = await controller.login(
    {
      email: 'candidate@example.com',
      password: '12345678',
      rememberMe: true
    },
    'req-login-flow-001',
    response
  );

  assert.equal(result.message, 'Login successful');
  assert.equal(result.data.user.id, 'identity-flow-1');
  assert.equal(result.data.accessToken, 'access-token:candidate@example.com');
  assert.equal(response.cookieCalls.length, 2);
  assert.equal(response.cookieCalls[0]?.name, 'refresh_token');
  assert.equal(response.cookieCalls[0]?.value, 'refresh-token-1');
  assert.equal(response.cookieCalls[1]?.name, 'refresh_token_present');
  assert.equal(response.cookieCalls[1]?.value, '1');
});

test('refresh reads cookie and rotates refresh token', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );
  const response = createCookieResponseMock();

  const result = await controller.refresh(
    {
      headers: {
        cookie: 'refresh_token=refresh-token-1'
      }
    },
    'req-refresh-flow-001',
    response
  );

  assert.equal(result.message, 'Token refreshed successfully');
  assert.equal(result.data.user.id, 'identity-flow-1');
  assert.equal(result.data.accessToken, 'access-token-refreshed:refresh-token-1');
  assert.equal(response.cookieCalls.length, 2);
  assert.equal(response.cookieCalls[0]?.value, 'refresh-token-2');
  assert.equal(response.cookieCalls[0]?.options.maxAge, undefined);
});

test('logout clears cookie and reports loggedOut', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );
  const response = createCookieResponseMock();

  const result = await controller.logout(
    {
      headers: {
        cookie: 'refresh_token=refresh-token-2'
      }
    },
    'req-logout-flow-001',
    response
  );

  assert.equal(result.message, 'Logout successful');
  assert.equal(result.data.loggedOut, true);
  assert.equal(response.clearCookieCalls.length, 2);
  assert.equal(response.clearCookieCalls[0]?.name, 'refresh_token');
  assert.equal(response.clearCookieCalls[1]?.name, 'refresh_token_present');
});

test('refresh fails clearly when refresh cookie is missing', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );
  const response = createCookieResponseMock();

  await assert.rejects(
    () =>
      controller.refresh(
        {
          headers: {}
        },
        'req-refresh-flow-002',
        response
      ),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      JSON.stringify(error.getResponse()).includes(
        'Refresh token cookie is missing or expired'
      )
  );
});

test('me resolves current identity through gateway auth service', async () => {
  const controller = new AuthController(
    gatewayAuthService as never,
    gatewayRuntimeConfig
  );

  const result = await controller.getMe(
    {
      email: 'candidate@example.com',
      id: 'identity-flow-1',
      role: 'candidate'
    },
    'req-me-flow-001'
  );

  assert.equal(result.message, 'Current user loaded successfully');
  assert.equal(result.data.user.userId, 'identity-flow-1');
  assert.equal(result.data.profile?.userId, 'identity-flow-1');
});
