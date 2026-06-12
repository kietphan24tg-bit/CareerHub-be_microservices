import assert from 'node:assert/strict';
import { GATEWAY_BASE_URL } from './live-env';
import { requestJson } from './live-http';
import type {
  CandidateProfileResponse,
  GatewayResume,
  GatewaySavedJob,
  ResumeTemplateListItem,
  SuccessEnvelope
} from './live-types';

export async function listResumeTemplates(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<ResumeTemplateListItem[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<ResumeTemplateListItem[]>>(
    '/candidate/resumes/templates',
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

export async function createOrGetTemplateDraft(input: {
  accessToken: string;
  requestId: string;
  templateId: string;
}): Promise<SuccessEnvelope<GatewayResume>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayResume>>(
    `/candidate/resumes/templates/${input.templateId}/draft`,
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

export async function listResumes(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayResume[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayResume[]>>(
    '/candidate/resumes',
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

export async function deleteResume(input: {
  accessToken: string;
  requestId: string;
  resumeId: string;
}): Promise<SuccessEnvelope<null>> {
  const { body, response } = await requestJson<SuccessEnvelope<null>>(
    `/candidate/resumes/${input.resumeId}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'DELETE'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function updateCandidateProfile(input: {
  accessToken: string;
  patch: Record<string, unknown>;
  requestId: string;
}): Promise<SuccessEnvelope<CandidateProfileResponse>> {
  const { body, response } = await requestJson<SuccessEnvelope<CandidateProfileResponse>>(
    '/candidate/profile',
    {
      body: JSON.stringify(input.patch),
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

export async function listSavedJobs(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewaySavedJob[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewaySavedJob[]>>(
    '/candidate/saved-jobs',
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

export async function saveJob(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewaySavedJob>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewaySavedJob>>(
    '/candidate/saved-jobs',
    {
      body: JSON.stringify({ jobId: input.jobId }),
      headers: {
        authorization: `Bearer ${input.accessToken}`,
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

export async function removeSavedJob(input: {
  accessToken: string;
  jobId: string;
  requestId: string;
}): Promise<SuccessEnvelope<null>> {
  const { body, response } = await requestJson<SuccessEnvelope<null>>(
    `/candidate/saved-jobs/${input.jobId}`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'DELETE'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function exportResumePdf(input: {
  accessToken: string;
  requestId: string;
  resumeId: string;
}): Promise<{ buffer: Buffer; response: Response }> {
  let response: Response;

  try {
    response = await fetch(
      `${GATEWAY_BASE_URL}/candidate/resumes/${input.resumeId}/export-pdf`,
      {
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'x-request-id': input.requestId
        },
        method: 'POST'
      }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(
      `Failed to reach resume export endpoint for ${input.resumeId}. Cause: ${reason}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return { buffer, response };
}
