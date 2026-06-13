import assert from 'node:assert/strict';
import { requestJson } from './live-http';
import type { ErrorEnvelope, SuccessEnvelope } from './live-types';

export type GatewayApplication = {
  appliedAt: string;
  application?: {
    coverLetter: string | null;
  };
  availableActions?: {
    acceptOffer: boolean;
    confirmInterview: boolean;
    declineInterview: boolean;
    declineOffer: boolean;
    requestReschedule: boolean;
    viewInterview: boolean;
    viewOffers: boolean;
    withdrawApplication: boolean;
  };
  candidateUserId?: string;
  company?: {
    city: string | null;
    companyName: string;
    country: string | null;
    id: string;
    initials: string;
    logoUrl: string | null;
    name: string;
  };
  coverLetter: string | null;
  displayGroup?: string;
  id: string;
  interview?:
    | {
        date: string | null;
        endTime?: string | null;
        exists?: boolean;
        id: string | null;
        round: string | null;
        startTime: string | null;
        status: string | null;
        timezone?: string | null;
      }
    | null;
  jobId: string;
  job?: {
    city: string | null;
    country: string | null;
    currency: string | null;
    employmentLabel: string;
    employmentType: string | null;
    expiresAt: string | null;
    id: string;
    isRemote: boolean;
    locationLine: string;
    salaryMax: string | null;
    salaryMin: string | null;
    salaryTag: string;
    slug: string;
    title: string;
    workStyleTag: string;
  };
  offer?:
    | {
        exists: boolean;
        expiresAt: string | null;
        id: string | null;
        needsResponse: boolean;
        respondedAt: string | null;
        sentAt: string | null;
        status: string | null;
      }
    | null;
  resumeId: string | null;
  resume?: { id: string; title: string } | null;
  status: string;
  timeline?: GatewayApplicationTimelineItem[];
  updatedAt: string;
};

export type GatewayApplicationTimelineItem = {
  actorIdentityId: string | null;
  actorType: string | null;
  applicationId: string;
  createdAt: string;
  eventType: string;
  id: string;
  newStatus: string | null;
  note: string | null;
  oldStatus: string | null;
};

type ApplicationListResponse = {
  items: GatewayApplication[];
  meta?: { page: number; pageSize: number; total: number };
};

type AtsBoardResponse = {
  applications: Array<{
    applicationId: number;
    candidateId: number;
    candidateName: string | null;
    headline: string | null;
    location: string | null;
    skills: string[];
    stage: string;
    stageContext: { label: string; type: string } | null;
    updatedAt: string;
    yearsExperience: number | null;
  }>;
  job: { id: number; title: string };
};

export async function applyToJob(input: {
  accessToken: string;
  coverLetter?: string;
  jobId: string;
  requestId: string;
  resumeId: string;
}): Promise<SuccessEnvelope<GatewayApplication>> {
  const result = await applyToJobRequest(input);

  assert.ok(result.response.status === 200 || result.response.status === 201);
  assert.equal(result.body.success, true);

  return result.body;
}

export async function applyToJobRequest(input: {
  accessToken: string;
  coverLetter?: string;
  jobId: string;
  requestId: string;
  resumeId: string;
}): Promise<{
  body: SuccessEnvelope<GatewayApplication> | ErrorEnvelope;
  response: Response;
}> {
  return requestJson<SuccessEnvelope<GatewayApplication> | ErrorEnvelope>(
    `/candidate/jobs/${input.jobId}/applications`,
    {
      body: JSON.stringify({
        coverLetter: input.coverLetter,
        resumeId: input.resumeId
      }),
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );
}

export async function listCandidateApplications(input: {
  accessToken: string;
  requestId: string;
  status?: string;
}): Promise<SuccessEnvelope<ApplicationListResponse>> {
  const query = input.status ? `?status=${encodeURIComponent(input.status)}` : '';
  const { body, response } = await requestJson<SuccessEnvelope<ApplicationListResponse>>(
    `/candidate/applications${query}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getCandidateApplication(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayApplication>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayApplication>>(
    `/candidate/applications/${input.applicationId}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function withdrawApplication(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayApplication>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayApplication>>(
    `/candidate/applications/${input.applicationId}/withdraw`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.ok(response.status === 200 || response.status === 201);
  assert.equal(body.success, true);

  return body;
}

export async function listJobApplications(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<ApplicationListResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<ApplicationListResponse>>(
    `/employer/jobs/${input.jobId}/applications`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function updateApplicationStatus(input: {
  accessToken: string;
  applicationId: string;
  note?: string;
  requestId: string;
  status: string;
}): Promise<SuccessEnvelope<GatewayApplication>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayApplication>>(
    `/employer/applications/${input.applicationId}/status`,
    {
      body: JSON.stringify({ note: input.note, status: input.status }),
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'PATCH'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getEmployerApplication(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayApplication>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayApplication>>(
    `/employer/applications/${input.applicationId}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getApplicationHistory(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayApplicationTimelineItem[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayApplicationTimelineItem[]>>(
    `/employer/applications/${input.applicationId}/history`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function getAtsBoard(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<AtsBoardResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<AtsBoardResponse>>(
    `/employer/ats/${input.jobId}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}
