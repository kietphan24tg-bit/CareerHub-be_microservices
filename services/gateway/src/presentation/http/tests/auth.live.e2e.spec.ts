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

type PasswordResetAcceptedResponse = {
  accepted: boolean;
};

type PasswordResetResponse = {
  passwordReset: boolean;
};

type MeResponse = {
  user: {
    email: string;
    id: string;
    role: Role;
    status: string;
  };
};

type CandidateProfileResponse = {
  profile: {
    address: string | null;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string;
    fullName: string;
    githubUrl: string | null;
    headline: string | null;
    id: string;
    identityId: string;
    linkedinUrl: string | null;
    phone: string | null;
    portfolioUrl: string | null;
    updatedAt: string;
    yearsExperience: number | null;
  };
};

type CompanyProfileResponse = {
  profile: {
    address: string | null;
    companyName: string;
    companySize: string | null;
    contactName: string | null;
    contactPhone: string | null;
    createdAt: string;
    description: string | null;
    foundedYear: number | null;
    id: string;
    identityId: string;
    industry: string | null;
    logoUrl: string | null;
    taxCode: string | null;
    updatedAt: string;
    website: string | null;
  };
};

const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL ?? 'http://127.0.0.1:3000';
const MAILHOG_API_BASE_URL =
  process.env.MAILHOG_API_BASE_URL ?? 'http://127.0.0.1:8025';
const RESET_PASSWORD_URL_BASE =
  process.env.RESET_PASSWORD_URL_BASE ?? 'http://localhost:5173/reset-password';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function extractResetTokenFromBody(body: string): string | undefined {
  const normalizedBody = body
    .replaceAll('&amp;', '&')
    .replaceAll('=3D', '=')
    .replace(/=\r?\n/g, '');
  const tokenMatch = normalizedBody.match(
    new RegExp(`${RESET_PASSWORD_URL_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?token=([^\\s"'<>]+)`)
  );

  if (!tokenMatch?.[1]) {
    return undefined;
  }

  return decodeURIComponent(tokenMatch[1]);
}

async function fetchPasswordResetTokenFromMailHog(email: string): Promise<string> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${MAILHOG_API_BASE_URL}/api/v2/messages`);

    if (response.ok) {
      const payload = (await response.json()) as {
        items?: Array<{
          Content?: {
            Body?: unknown;
            Headers?: Record<string, unknown>;
          };
        }>;
      };

      for (const item of payload.items ?? []) {
        const headers = item.Content?.Headers ?? {};
        const recipients = [
          ...readStringArray(headers.To),
          ...readStringArray(headers['Delivered-To'])
        ];

        if (!recipients.some((recipient) => recipient.includes(email))) {
          continue;
        }

        const body = typeof item.Content?.Body === 'string' ? item.Content.Body : '';
        const resetToken = extractResetTokenFromBody(body);

        if (resetToken) {
          return resetToken;
        }
      }
    }

    await sleep(500);
  }

  throw new Error(`Password reset email for ${email} was not found in MailHog`);
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

async function loginWithPassword(
  email: string,
  password: string
): Promise<{ body: SuccessEnvelope<LoginResponse> | ErrorEnvelope; response: Response }> {
  return requestJson<SuccessEnvelope<LoginResponse> | ErrorEnvelope>('/auth/login', {
    body: JSON.stringify({
      email,
      password,
      rememberMe: true
    }),
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'e2e-login-with-password'
    },
    method: 'POST'
  });
}

async function requestPasswordReset(
  email: string
): Promise<SuccessEnvelope<PasswordResetAcceptedResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<PasswordResetAcceptedResponse>
  >('/auth/forgot-password', {
    body: JSON.stringify({
      email
    }),
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'e2e-forgot-password'
    },
    method: 'POST'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.accepted, true);

  return body;
}

async function resetPassword(
  token: string,
  newPassword: string
): Promise<SuccessEnvelope<PasswordResetResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<PasswordResetResponse>>(
    '/auth/reset-password',
    {
      body: JSON.stringify({
        newPassword,
        token
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'e2e-reset-password'
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.passwordReset, true);

  return body;
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

async function getCandidateProfile(
  accessToken: string
): Promise<SuccessEnvelope<CandidateProfileResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<CandidateProfileResponse>
  >('/candidate-profiles/me', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-request-id': 'e2e-candidate-profile-get'
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

async function updateCandidateProfile(
  accessToken: string
): Promise<SuccessEnvelope<CandidateProfileResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<CandidateProfileResponse>
  >('/candidate-profiles/me', {
    body: JSON.stringify({
      bio: 'Candidate bio updated from live e2e',
      githubUrl: 'https://github.com/candidate-live',
      headline: 'Senior Candidate',
      yearsExperience: 4
    }),
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-request-id': 'e2e-candidate-profile-update'
    },
    method: 'PATCH'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

async function getCompanyProfile(
  accessToken: string
): Promise<SuccessEnvelope<CompanyProfileResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<CompanyProfileResponse>
  >('/company-profiles/me', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-request-id': 'e2e-company-profile-get'
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

async function updateCompanyProfile(
  accessToken: string
): Promise<SuccessEnvelope<CompanyProfileResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<CompanyProfileResponse>
  >('/company-profiles/me', {
    body: JSON.stringify({
      companySize: '51-200',
      description: 'Updated employer description from live e2e',
      website: 'https://careerhub.dev'
    }),
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-request-id': 'e2e-company-profile-update'
    },
    method: 'PATCH'
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

  if (role === 'candidate') {
    const candidateProfile = await getCandidateProfile(loginResult.accessToken);
    assert.equal(candidateProfile.data.profile.fullName, 'Candidate Phase 1');

    const updatedCandidateProfile = await updateCandidateProfile(
      loginResult.accessToken
    );
    assert.equal(updatedCandidateProfile.data.profile.headline, 'Senior Candidate');
    assert.equal(
      updatedCandidateProfile.data.profile.githubUrl,
      'https://github.com/candidate-live'
    );
    assert.equal(updatedCandidateProfile.data.profile.yearsExperience, 4);

    const employerPathResult = await requestJson<ErrorEnvelope>('/company-profiles/me', {
      headers: {
        authorization: `Bearer ${loginResult.accessToken}`,
        'x-request-id': 'e2e-candidate-forbidden-company-profile'
      },
      method: 'GET'
    });

    assert.equal(employerPathResult.response.status, 403);
  } else {
    const companyProfile = await getCompanyProfile(loginResult.accessToken);
    assert.equal(companyProfile.data.profile.companyName, 'CareerHub Co');

    const updatedCompanyProfile = await updateCompanyProfile(
      loginResult.accessToken
    );
    assert.equal(
      updatedCompanyProfile.data.profile.description,
      'Updated employer description from live e2e'
    );
    assert.equal(updatedCompanyProfile.data.profile.website, 'https://careerhub.dev');
    assert.equal(updatedCompanyProfile.data.profile.companySize, '51-200');

    const candidatePathResult = await requestJson<ErrorEnvelope>('/candidate-profiles/me', {
      headers: {
        authorization: `Bearer ${loginResult.accessToken}`,
        'x-request-id': 'e2e-employer-forbidden-candidate-profile'
      },
      method: 'GET'
    });

    assert.equal(candidatePathResult.response.status, 403);
  }

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

test(
  'candidate password reset works end-to-end through gateway and MailHog',
  { timeout: 30_000 },
  async () => {
    const email = createUniqueEmail('candidate.password-reset.live');
    const oldPassword = '12345678';
    const newPassword = '87654321';

    await registerCandidate(email);
    await requestPasswordReset(email);

    const resetToken = await fetchPasswordResetTokenFromMailHog(email);

    await resetPassword(resetToken, newPassword);

    const oldLogin = await loginWithPassword(email, oldPassword);
    assert.equal(oldLogin.response.status, 401);
    assert.equal(oldLogin.body.success, false);
    assert.equal(oldLogin.body.error.code, 'UNAUTHENTICATED');

    const newLogin = await loginWithPassword(email, newPassword);
    assert.equal(newLogin.response.status, 200);
    assert.equal(newLogin.body.success, true);
  }
);
