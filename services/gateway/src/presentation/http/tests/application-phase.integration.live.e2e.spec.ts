import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyToJob,
  applyToJobRequest,
  getAtsBoard,
  getCandidateApplication,
  getEmployerApplication,
  listCandidateApplications,
  listJobApplications,
  updateApplicationStatus,
  withdrawApplication
} from './helpers/live-gateway-applications';
import {
  createOrGetTemplateDraft,
  listResumeTemplates
} from './helpers/live-gateway-candidate';
import {
  createEmployerJob,
  listEmployerJobs,
  publishEmployerJob
} from './helpers/live-gateway-jobs';
import {
  login,
  registerCandidate,
  registerEmployer
} from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';

const DEFAULT_TEMPLATE_ID = 'resume-template-classic-1';

async function setupPublishedJobAndCandidateResume() {
  const employerEmail = createUniqueEmail('application.phase.employer');
  const candidateEmail = createUniqueEmail('application.phase.candidate');

  await registerEmployer({
    email: employerEmail,
    requestId: createRequestId('application-employer-register')
  });

  const employerLogin = await login({
    email: employerEmail,
    password: '12345678',
    requestId: createRequestId('application-employer-login')
  });
  assert.equal(employerLogin.response.status, 200);

  const created = await createEmployerJob({
    accessToken: employerLogin.accessToken,
    requestId: createRequestId('application-job-create'),
    title: `Application Integration Job ${Date.now()}`
  });
  assert.equal(created.data.status, 'draft');

  const published = await publishEmployerJob({
    accessToken: employerLogin.accessToken,
    jobId: created.data.id,
    requestId: createRequestId('application-job-publish')
  });
  assert.equal(published.data.status, 'published');

  await registerCandidate({
    email: candidateEmail,
    requestId: createRequestId('application-candidate-register')
  });

  const candidateLogin = await login({
    email: candidateEmail,
    password: '12345678',
    requestId: createRequestId('application-candidate-login')
  });
  assert.equal(candidateLogin.response.status, 200);

  const templates = await listResumeTemplates({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('application-resume-templates')
  });
  assert.ok(templates.data.length > 0);

  const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;
  const draft = await createOrGetTemplateDraft({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('application-resume-draft'),
    templateId
  });
  assert.ok(draft.data.id.length > 0);

  return {
    candidateLogin,
    employerLogin,
    job: published.data,
    resumeId: draft.data.id
  };
}

test(
  'application phase integration covers apply, list, status update, counts, ATS board, and withdraw',
  { timeout: 120_000 },
  async () => {
    const { candidateLogin, employerLogin, job, resumeId } =
      await setupPublishedJobAndCandidateResume();

    const applied = await applyToJob({
      accessToken: candidateLogin.accessToken,
      coverLetter: 'Interested in this role.',
      jobId: job.id,
      requestId: createRequestId('application-apply'),
      resumeId
    });
    assert.equal(applied.data.status, 'applied');
    assert.equal(applied.data.jobId, job.id);

    const employerJobs = await listEmployerJobs({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('application-employer-job-counts')
    });
    const jobWithCount = employerJobs.data.items.find((item) => item.id === job.id);
    assert.ok((jobWithCount?.applicationCount ?? 0) >= 1);

    const candidateList = await listCandidateApplications({
      accessToken: candidateLogin.accessToken,
      requestId: createRequestId('application-candidate-list')
    });
    assert.ok(
      candidateList.data.items.some((item) => item.id === applied.data.id)
    );

    const candidateDetail = await getCandidateApplication({
      accessToken: candidateLogin.accessToken,
      applicationId: applied.data.id,
      requestId: createRequestId('application-candidate-detail')
    });
    assert.equal(candidateDetail.data.status, 'applied');
    assert.ok(Array.isArray(candidateDetail.data.timeline));
    assert.ok((candidateDetail.data.timeline ?? []).length > 0);

    const employerList = await listJobApplications({
      accessToken: employerLogin.accessToken,
      jobId: job.id,
      requestId: createRequestId('application-employer-list')
    });
    assert.ok(
      employerList.data.items.some((item) => item.id === applied.data.id)
    );

    const reviewed = await updateApplicationStatus({
      accessToken: employerLogin.accessToken,
      applicationId: applied.data.id,
      note: 'Move in ATS',
      requestId: createRequestId('application-status-reviewed'),
      status: 'reviewed'
    });
    assert.equal(reviewed.data.status, 'reviewed');

    const employerDetail = await getEmployerApplication({
      accessToken: employerLogin.accessToken,
      applicationId: applied.data.id,
      requestId: createRequestId('application-employer-detail')
    });
    assert.equal(employerDetail.data.status, 'reviewed');

    const updatedCandidateDetail = await getCandidateApplication({
      accessToken: candidateLogin.accessToken,
      applicationId: applied.data.id,
      requestId: createRequestId('application-candidate-detail-after-review')
    });
    assert.equal(updatedCandidateDetail.data.status, 'reviewed');
    assert.ok(
      (updatedCandidateDetail.data.timeline ?? []).some(
        (item) =>
          item.note === 'Move in ATS' &&
          item.newStatus === 'reviewed' &&
          item.actorType === 'employer'
      )
    );

    const atsBoard = await getAtsBoard({
      accessToken: employerLogin.accessToken,
      jobId: job.id,
      requestId: createRequestId('application-ats-board')
    });
    assert.equal(atsBoard.data.job.title, job.title);
    assert.ok(
      atsBoard.data.applications.some(
        (application) => application.stage === 'reviewed'
      )
    );

    const withdrawn = await withdrawApplication({
      accessToken: candidateLogin.accessToken,
      applicationId: applied.data.id,
      requestId: createRequestId('application-withdraw')
    });
    assert.equal(withdrawn.data.status, 'withdrawn');
  }
);

test(
  'application phase rejects duplicate apply with conflict',
  { timeout: 120_000 },
  async () => {
    const { candidateLogin, job, resumeId } = await setupPublishedJobAndCandidateResume();

    await applyToJob({
      accessToken: candidateLogin.accessToken,
      jobId: job.id,
      requestId: createRequestId('application-apply-first'),
      resumeId
    });

    const duplicate = await applyToJobRequest({
      accessToken: candidateLogin.accessToken,
      jobId: job.id,
      requestId: createRequestId('application-apply-duplicate'),
      resumeId
    });

    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.success, false);
    assert.ok(['CONFLICT', 'DUPLICATE_APPLICATION', 'ALREADY_EXISTS'].includes(duplicate.body.error.code));
  }
);

test(
  'application phase rejects apply to unpublished job',
  { timeout: 120_000 },
  async () => {
    const employerEmail = createUniqueEmail('application.phase.draft.employer');
    const candidateEmail = createUniqueEmail('application.phase.draft.candidate');

    await registerEmployer({
      email: employerEmail,
      requestId: createRequestId('application-draft-employer-register')
    });

    const employerLogin = await login({
      email: employerEmail,
      password: '12345678',
      requestId: createRequestId('application-draft-employer-login')
    });

    const draftJob = await createEmployerJob({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('application-draft-job-create'),
      title: `Draft Application Job ${Date.now()}`
    });
    assert.equal(draftJob.data.status, 'draft');

    await registerCandidate({
      email: candidateEmail,
      requestId: createRequestId('application-draft-candidate-register')
    });

    const candidateLogin = await login({
      email: candidateEmail,
      password: '12345678',
      requestId: createRequestId('application-draft-candidate-login')
    });

    const templates = await listResumeTemplates({
      accessToken: candidateLogin.accessToken,
      requestId: createRequestId('application-draft-resume-templates')
    });
    const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;
    const draftResume = await createOrGetTemplateDraft({
      accessToken: candidateLogin.accessToken,
      requestId: createRequestId('application-draft-resume-draft'),
      templateId
    });

    const rejected = await applyToJobRequest({
      accessToken: candidateLogin.accessToken,
      jobId: draftJob.data.id,
      requestId: createRequestId('application-apply-draft-job'),
      resumeId: draftResume.data.id
    });

    assert.equal(rejected.response.status, 422);
    assert.equal(rejected.body.success, false);
    assert.equal(rejected.body.error.code, 'JOB_NOT_OPEN');
  }
);
