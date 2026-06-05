import assert from 'node:assert/strict';
import test from 'node:test';

type Role = 'candidate' | 'employer';

type SuccessEnvelope<T> = {
  data: T;
  message: string;
  success: true;
};

type ErrorEnvelope = {
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
  path: string;
  requestId?: string;
  statusCode: number;
  success: false;
  timestamp: string;
};

type RegisterResponse = {
  email: string;
  role: Role;
  userId: string;
};

type LoginResponse = {
  accessToken: string;
  user: {
    email: string;
    id: string;
    role: Role;
  };
};

type MeResponse = {
  user: {
    email: string;
    id: string;
    role: Role;
    status: string;
  };
};

const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL ?? 'http://127.0.0.1:3000';

function createUniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2, 8)}@example.com`;
}

function extractCookieValue(cookieHeader: string, name: string): string | undefined {
  const [pair] = cookieHeader.split(';');
  const [cookieName, cookieValue] = pair.split('=');

  if (cookieName?.trim() !== name) {
    return undefined;
  }

  return cookieValue;
}

function extractRefreshToken(setCookieHeaders: string[]): string {
  for (const header of setCookieHeaders) {
    const value = extractCookieValue(header, 'refresh_token');

    if (value) {
      return value;
    }
  }

  throw new Error('refresh_token cookie not found in response headers');
}

async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ body: T; response: Response }> {
  const response = await fetch(`${GATEWAY_BASE_URL}${path}`, init);
  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);

  return {
    body,
    response
  };
}

async function registerCandidate(email: string): Promise<SuccessEnvelope<RegisterResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<RegisterResponse>>(
    '/auth/candidate/register',
    {
      body: JSON.stringify({
        acceptTerms: true,
        confirmPassword: '12345678',
        email,
        fullName: 'Candidate Phase 1',
        password: '12345678',
        phone: '0123456789'
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'e2e-candidate-register'
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.email, email);
  assert.equal(body.data.role, 'candidate');

  return body;
}

async function registerEmployer(email: string): Promise<SuccessEnvelope<RegisterResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<RegisterResponse>>(
    '/auth/employer/register',
    {
      body: JSON.stringify({
        acceptTerms: true,
        address: 'Ho Chi Minh City',
        companyEmail: email,
        companyName: 'CareerHub Co',
        confirmPassword: '12345678',
        fullName: 'Employer Admin',
        industry: 'Technology',
        password: '12345678',
        phone: '0987654321'
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'e2e-employer-register'
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.email, email);
  assert.equal(body.data.role, 'employer');

  return body;
}

async function login(email: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: LoginResponse['user'];
}> {
  const { body, response } = await requestJson<SuccessEnvelope<LoginResponse>>(
    '/auth/login',
    {
      body: JSON.stringify({
        email,
        password: '12345678',
        rememberMe: true
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'e2e-login'
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  const refreshToken = extractRefreshToken(response.headers.getSetCookie());

  return {
    accessToken: body.data.accessToken,
    refreshToken,
    user: body.data.user
  };
}

async function getMe(accessToken: string): Promise<SuccessEnvelope<MeResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<MeResponse>>('/auth/me', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-request-id': 'e2e-me'
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

async function refresh(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; user: LoginResponse['user'] }> {
  const { body, response } = await requestJson<SuccessEnvelope<LoginResponse>>(
    '/auth/refresh',
    {
      headers: {
        cookie: `refresh_token=${refreshToken}`,
        'x-request-id': 'e2e-refresh'
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return {
    accessToken: body.data.accessToken,
    refreshToken: extractRefreshToken(response.headers.getSetCookie()),
    user: body.data.user
  };
}

async function logout(refreshToken: string): Promise<SuccessEnvelope<{ loggedOut: boolean }>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<{ loggedOut: boolean }>
  >('/auth/logout', {
    headers: {
      cookie: `refresh_token=${refreshToken}`,
      'x-request-id': 'e2e-logout'
    },
    method: 'POST'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.loggedOut, true);

  return body;
}

async function refreshAfterLogout(refreshToken: string): Promise<{
  body: ErrorEnvelope;
  response: Response;
}> {
  const result = await requestJson<ErrorEnvelope>('/auth/refresh', {
    headers: {
      cookie: `refresh_token=${refreshToken}`,
      'x-request-id': 'e2e-refresh-after-logout'
    },
    method: 'POST'
  });

  assert.equal(result.response.ok, false);
  return result;
}

async function runAuthFlow(role: Role): Promise<void> {
  const email =
    role === 'candidate'
      ? createUniqueEmail('candidate.live')
      : createUniqueEmail('employer.live');

  if (role === 'candidate') {
    await registerCandidate(email);
  } else {
    await registerEmployer(email);
  }

  const loginResult = await login(email);
  assert.equal(loginResult.user.email, email);
  assert.equal(loginResult.user.role, role);

  const meResult = await getMe(loginResult.accessToken);
  assert.equal(meResult.data.user.email, email);
  assert.equal(meResult.data.user.role, role);
  assert.equal(meResult.data.user.status, 'active');

  const refreshResult = await refresh(loginResult.refreshToken);
  assert.equal(refreshResult.user.email, email);
  assert.equal(refreshResult.user.role, role);
  assert.notEqual(refreshResult.refreshToken, loginResult.refreshToken);

  await logout(refreshResult.refreshToken);

  const refreshAfterLogoutResult = await refreshAfterLogout(refreshResult.refreshToken);
  assert.equal(refreshAfterLogoutResult.response.status, 401);
  assert.equal(refreshAfterLogoutResult.body.success, false);
  assert.equal(refreshAfterLogoutResult.body.error.code, 'UNAUTHORIZED');
}

test('candidate live auth flow works end-to-end through gateway', async () => {
  await runAuthFlow('candidate');
});

test('employer live auth flow works end-to-end through gateway', async () => {
  await runAuthFlow('employer');
});
