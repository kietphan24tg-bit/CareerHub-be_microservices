import assert from 'node:assert/strict';
import test from 'node:test';
import { createPgClient, type SqlClient } from './helpers/live-db';
import {
  createOrGetTemplateDraft,
  deleteResume,
  listResumes,
  listResumeTemplates,
  listSavedJobs,
  removeSavedJob,
  saveJob,
  updateCandidateProfile
} from './helpers/live-gateway-candidate';
import {
  getCandidateProfile,
  login,
  registerCandidate
} from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { pollUntil } from './helpers/live-polling';

const DEFAULT_TEMPLATE_ID = 'resume-template-classic-1';

type CandidateProfileRow = {
  resume_id: string | null;
};

type ResumeRow = {
  id: string;
  identity_id: string;
  is_using: boolean;
};

async function findCandidateProfileResumeId(
  client: SqlClient,
  identityId: string
): Promise<CandidateProfileRow | null> {
  const result = await client.query<CandidateProfileRow>(
    `
      select resume_id
      from candidate_profiles
      where identity_id = $1
    `,
    [identityId]
  );

  return result.rows[0] ?? null;
}

async function findResumeById(
  client: SqlClient,
  resumeId: string
): Promise<ResumeRow | null> {
  const result = await client.query<ResumeRow>(
    `
      select id, identity_id, is_using
      from resumes
      where id = $1
    `,
    [resumeId]
  );

  return result.rows[0] ?? null;
}

test(
  'candidate module integration flow covers profile resumeId, resumes, and saved jobs',
  { timeout: 60_000 },
  async () => {
    const email = createUniqueEmail('candidate.module.integration');
    const jobId = `job-live-${Date.now()}`;
    const candidateClient = createPgClient('candidate-service');
    await candidateClient.connect();

    try {
      const registerResult = await registerCandidate({
        email,
        fullName: 'Candidate Module Integration',
        phone: '0900111222',
        requestId: createRequestId('integration-candidate-register')
      });

      const loginResult = await login({
        email,
        password: '12345678',
        requestId: createRequestId('integration-candidate-login')
      });
      assert.equal(loginResult.response.status, 200);

      const accessToken = loginResult.accessToken;
      const identityId = registerResult.data.userId;

      const templates = await listResumeTemplates({
        accessToken,
        requestId: createRequestId('integration-templates')
      });
      assert.ok(templates.data.length > 0);

      const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;

      const draft = await createOrGetTemplateDraft({
        accessToken,
        requestId: createRequestId('integration-draft'),
        templateId
      });
      const resumeId = draft.data.id;
      assert.ok(resumeId.length > 0);

      const profileWithResume = await updateCandidateProfile({
        accessToken,
        patch: { resumeId },
        requestId: createRequestId('integration-profile-resume')
      });
      assert.equal(profileWithResume.data.profile.resumeId, resumeId);

      const resumes = await listResumes({
        accessToken,
        requestId: createRequestId('integration-resumes-list')
      });
      const selectedResume = resumes.data.find((resume) => resume.id === resumeId);
      assert.ok(selectedResume);
      assert.equal(selectedResume.isUsing, true);

      const profileRow = await pollUntil(async () => {
        const row = await findCandidateProfileResumeId(candidateClient, identityId);
        return row?.resume_id === resumeId ? row : null;
      });
      assert.equal(profileRow.resume_id, resumeId);

      const resumeRow = await pollUntil(async () => {
        const row = await findResumeById(candidateClient, resumeId);
        return row?.is_using === true ? row : null;
      });
      assert.equal(resumeRow.is_using, true);

      const savedJob = await saveJob({
        accessToken,
        jobId,
        requestId: createRequestId('integration-save-job')
      });
      assert.equal(savedJob.data.jobId, jobId);

      const savedJobs = await listSavedJobs({
        accessToken,
        requestId: createRequestId('integration-list-saved-jobs')
      });
      assert.equal(savedJobs.data.some((item) => item.jobId === jobId), true);

      await removeSavedJob({
        accessToken,
        jobId,
        requestId: createRequestId('integration-remove-saved-job')
      });

      const savedJobsAfterRemove = await listSavedJobs({
        accessToken,
        requestId: createRequestId('integration-list-saved-jobs-after-remove')
      });
      assert.equal(savedJobsAfterRemove.data.some((item) => item.jobId === jobId), false);

      await deleteResume({
        accessToken,
        requestId: createRequestId('integration-delete-resume'),
        resumeId
      });

      const profileAfterDelete = await getCandidateProfile({
        accessToken,
        requestId: createRequestId('integration-profile-after-delete')
      });
      assert.equal(profileAfterDelete.data.profile.resumeId, null);

      const profileRowAfterDelete = await pollUntil(async () => {
        const row = await findCandidateProfileResumeId(candidateClient, identityId);
        return row?.resume_id === null ? row : null;
      });
      assert.equal(profileRowAfterDelete.resume_id, null);
    } finally {
      await candidateClient.end();
    }
  }
);