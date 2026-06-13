import assert from 'node:assert/strict';
import { requestJson } from './live-http';
import type { SuccessEnvelope } from './live-types';

type JobResponse = {
  applicationCount?: number;
  id: string;
  slug: string;
  status: string;
  title: string;
};

type JobListResponse = {
  items: JobResponse[];
  meta?: { page: number; pageSize: number; total: number };
};

export async function createEmployerJob(input: {
  accessToken: string;
  requestId: string;
  title: string;
}): Promise<SuccessEnvelope<JobResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobResponse>>('/employer/jobs', {
    body: JSON.stringify({ title: input.title }),
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json',
      'x-request-id': input.requestId
    },
    method: 'POST'
  });

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  return body;
}

export async function publishEmployerJob(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<JobResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobResponse>>(
    `/employer/jobs/${input.jobId}/publish`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  return body;
}

export async function closeEmployerJob(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<JobResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobResponse>>(
    `/employer/jobs/${input.jobId}/close`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  return body;
}

export async function listPublicJobs(requestId: string): Promise<SuccessEnvelope<JobListResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobListResponse>>('/jobs', {
    headers: { 'x-request-id': requestId }
  });

  assert.equal(response.status, 200);
  return body;
}

export async function listEmployerJobs(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<JobListResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobListResponse>>('/employer/jobs', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    }
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  return body;
}

export async function getPublicJobBySlug(input: {
  requestId: string;
  slug: string;
}): Promise<SuccessEnvelope<JobResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<JobResponse>>(`/jobs/${input.slug}`, {
    headers: { 'x-request-id': input.requestId }
  });

  assert.equal(response.status, 200);
  return body;
}