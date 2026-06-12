import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOrGetTemplateDraft,
  exportResumePdf,
  listResumeTemplates
} from './helpers/live-gateway-candidate';
import { login, registerCandidate } from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';

const DEFAULT_TEMPLATE_ID = 'resume-template-classic-1';
const RESUME_PRINT_BASE_URL =
  process.env.RESUME_PRINT_BASE_URL ?? 'http://127.0.0.1:5173';

async function assertFrontendReachable(): Promise<void> {
  try {
    const response = await fetch(`${RESUME_PRINT_BASE_URL}/resume-print`, {
      redirect: 'manual'
    });

    if (response.status >= 500) {
      throw new Error(`Frontend returned status ${response.status}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(
      `Failed to reach frontend at ${RESUME_PRINT_BASE_URL}. Start CareerHub-fe with PORT=5173 and NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000. Cause: ${reason}`
    );
  }
}

test(
  'resume export pdf returns a valid PDF through gateway and frontend print page',
  { timeout: 120_000 },
  async () => {
    await assertFrontendReachable();

    const email = createUniqueEmail('resume.export.pdf');
    await registerCandidate({
      email,
      fullName: 'Resume Export PDF',
      phone: '0900333444',
      requestId: createRequestId('integration-resume-export-register')
    });

    const loginResult = await login({
      email,
      password: '12345678',
      requestId: createRequestId('integration-resume-export-login')
    });
    assert.equal(loginResult.response.status, 200);

    const accessToken = loginResult.accessToken;

    const templates = await listResumeTemplates({
      accessToken,
      requestId: createRequestId('integration-resume-export-templates')
    });
    assert.ok(templates.data.length > 0);

    const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;
    const draft = await createOrGetTemplateDraft({
      accessToken,
      requestId: createRequestId('integration-resume-export-draft'),
      templateId
    });
    const resumeId = draft.data.id;
    assert.ok(resumeId.length > 0);

    const { buffer, response } = await exportResumePdf({
      accessToken,
      requestId: createRequestId('integration-resume-export-pdf'),
      resumeId
    });

    assert.ok(response.status === 200 || response.status === 201);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/pdf/i
    );
    assert.ok(buffer.byteLength > 1_000);
    assert.equal(buffer.subarray(0, 4).toString('ascii'), '%PDF');
  }
);