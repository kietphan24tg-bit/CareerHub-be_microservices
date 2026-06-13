import assert from 'node:assert/strict';
import { requestJson } from './live-http';
import type { SuccessEnvelope } from './live-types';

export type GatewayInterviewDetail = {
  applicationId: string;
  id: string;
  jobId: string;
  round: string;
  status: string;
  type: string;
};

export type GatewayEmployerInterviewListItem = GatewayInterviewDetail & {
  candidate?: { fullName: string; id: string };
  job?: { id: string; title: string };
};

export type GatewayOfferDetail = {
  applicationId: string;
  id: string;
  status: string;
  title: string;
  viewedAt?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
};

export type BenefitCatalogItem = {
  code: string;
  id: string;
  label: string;
  requiresAnnualLeaveDays: boolean;
};

function authHeaders(accessToken: string, requestId: string, withBody = false) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    'x-request-id': requestId
  };

  if (withBody) {
    headers['content-type'] = 'application/json';
  }

  return headers;
}

export async function listBenefitCatalog(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<BenefitCatalogItem[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<BenefitCatalogItem[]>>(
    '/employer/offers/benefits/catalog',
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function createInterview(input: {
  accessToken: string;
  applicationId: string;
  payload: {
    date: string;
    durationMinutes: number;
    meetingLink?: string;
    platform?: string;
    round: string;
    startTime: string;
    timezone?: string;
    type: string;
  };
  requestId: string;
}): Promise<SuccessEnvelope<GatewayInterviewDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayInterviewDetail>>(
    `/employer/applications/${input.applicationId}/interviews`,
    {
      body: JSON.stringify(input.payload),
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function listEmployerInterviews(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayEmployerInterviewListItem[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayEmployerInterviewListItem[]>>(
    '/employer/interviews',
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getCandidateInterview(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayInterviewDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayInterviewDetail>>(
    `/candidate/applications/${input.applicationId}/interview`,
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function confirmInterview(input: {
  accessToken: string;
  interviewId: string;
  note?: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayInterviewDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayInterviewDetail>>(
    `/candidate/interviews/${input.interviewId}/confirm`,
    {
      body: JSON.stringify({ candidateResponseNote: input.note ?? null }),
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function createOffer(input: {
  accessToken: string;
  applicationId: string;
  payload: {
    currency?: string;
    offerExpiresAt: string;
    salary?: number;
    startDate?: string;
    title: string;
  };
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/employer/applications/${input.applicationId}/offers`,
    {
      body: JSON.stringify(input.payload),
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function sendOffer(input: {
  accessToken: string;
  offerId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/employer/offers/${input.offerId}/send`,
    {
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function getEmployerOffer(input: {
  accessToken: string;
  offerId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/employer/offers/${input.offerId}`,
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function listCandidateOffersForApplication(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail[]>>(
    `/candidate/applications/${input.applicationId}/offers`,
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getCandidateOffer(input: {
  accessToken: string;
  offerId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/candidate/offers/${input.offerId}`,
    {
      headers: authHeaders(input.accessToken, input.requestId),
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function acceptOffer(input: {
  accessToken: string;
  note?: string;
  offerId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/candidate/offers/${input.offerId}/accept`,
    {
      body: JSON.stringify({ note: input.note ?? null }),
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function declineOffer(input: {
  accessToken: string;
  note?: string;
  offerId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayOfferDetail>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayOfferDetail>>(
    `/candidate/offers/${input.offerId}/decline`,
    {
      body: JSON.stringify({ note: input.note ?? null }),
      headers: authHeaders(input.accessToken, input.requestId, true),
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}
