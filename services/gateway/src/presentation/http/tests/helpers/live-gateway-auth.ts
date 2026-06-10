import assert from 'node:assert/strict';
import { extractRefreshToken, requestJson } from './live-http';
import type {
  CandidateProfileResponse,
  ErrorEnvelope,
  LoginResponse,
  MeResponse,
  PasswordResetAcceptedResponse,
  PasswordResetResponse,
  RegisterResponse,
  SuccessEnvelope
} from './live-types';

type CandidateRegistrationInput = {
  email: string;
  fullName?: string;
  password?: string;
  phone?: string;
  requestId: string;
};

export async function registerCandidate(
  input: CandidateRegistrationInput
): Promise<SuccessEnvelope<RegisterResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<RegisterResponse>>(
    '/auth/candidate/register',
    {
      body: JSON.stringify({
        acceptTerms: true,
        confirmPassword: input.password ?? '12345678',
        email: input.email,
        fullName: input.fullName ?? 'Candidate Phase 1',
        password: input.password ?? '12345678',
        phone: input.phone ?? '0123456789'
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);

  return body;
}

export async function login(input: {
  email: string;
  password: string;
  requestId: string;
}): Promise<{
  accessToken: string;
  body: SuccessEnvelope<LoginResponse> | ErrorEnvelope;
  refreshToken?: string;
  response: Response;
}> {
  const result = await requestJson<SuccessEnvelope<LoginResponse> | ErrorEnvelope>(
    '/auth/login',
    {
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        rememberMe: true
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  if (result.response.ok) {
    const successBody = result.body as SuccessEnvelope<LoginResponse>;

    return {
      accessToken: successBody.data.accessToken,
      body: successBody,
      refreshToken: extractRefreshToken(result.response.headers.getSetCookie()),
      response: result.response
    };
  }

  return {
    accessToken: '',
    body: result.body,
    response: result.response
  };
}

export async function getMe(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<MeResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<MeResponse>>('/auth/me', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getCandidateProfile(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<CandidateProfileResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<CandidateProfileResponse>
  >('/candidate-profiles/me', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function requestPasswordReset(input: {
  email: string;
  requestId: string;
}): Promise<SuccessEnvelope<PasswordResetAcceptedResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<PasswordResetAcceptedResponse>
  >('/auth/forgot-password', {
    body: JSON.stringify({ email: input.email }),
    headers: {
      'content-type': 'application/json',
      'x-request-id': input.requestId
    },
    method: 'POST'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.accepted, true);

  return body;
}

export async function resetPassword(input: {
  newPassword: string;
  requestId: string;
  token: string;
}): Promise<SuccessEnvelope<PasswordResetResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<PasswordResetResponse>>(
    '/auth/reset-password',
    {
      body: JSON.stringify({
        newPassword: input.newPassword,
        token: input.token
      }),
      headers: {
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.passwordReset, true);

  return body;
}

export async function resetPasswordExpectFailure(input: {
  newPassword: string;
  requestId: string;
  token: string;
}): Promise<{ body: ErrorEnvelope; response: Response }> {
  const result = await requestJson<ErrorEnvelope>('/auth/reset-password', {
    body: JSON.stringify({
      newPassword: input.newPassword,
      token: input.token
    }),
    headers: {
      'content-type': 'application/json',
      'x-request-id': input.requestId
    },
    method: 'POST'
  });

  assert.equal(result.response.ok, false);

  return result;
}
