import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmployerJob,
  getPublicJobBySlug,
  listPublicJobs,
  publishEmployerJob
} from './helpers/live-gateway-jobs';
import {
  listSavedJobs,
  saveJob
} from './helpers/live-gateway-candidate';
import {
  login,
  registerCandidate,
  registerEmployer
} from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { pollUntil } from './helpers/live-polling';

test(
  'job phase integration covers employer lifecycle and saved-jobs enrichment',
  { timeout: 90_000 },
  async () => {
    const employerEmail = createUniqueEmail('job.phase.employer');
    const candidateEmail = createUniqueEmail('job.phase.candidate');

    await registerEmployer({
      email: employerEmail,
      requestId: createRequestId('job-employer-register')
    });

    const employerLogin = await login({
      email: employerEmail,
      password: '12345678',
      requestId: createRequestId('job-employer-login')
    });
    assert.equal(employerLogin.response.status, 200);

    const created = await createEmployerJob({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('job-create'),
      title: `Integration Job ${Date.now()}`
    });
    assert.equal(created.data.status, 'draft');
    assert.ok(created.data.slug.length > 0);

    const published = await publishEmployerJob({
      accessToken: employerLogin.accessToken,
      jobId: created.data.id,
      requestId: createRequestId('job-publish')
    });
    assert.equal(published.data.status, 'published');

    const publicList = await pollUntil(async () => {
      const response = await listPublicJobs(createRequestId('job-public-list'));
      return response.data.items.some((job) => job.id === created.data.id) ? response : null;
    }, { timeoutMs: 20_000, intervalMs: 500 });
    assert.ok(publicList.data.items.some((job) => job.id === created.data.id));

    const publicDetail = await getPublicJobBySlug({
      requestId: createRequestId('job-public-detail'),
      slug: created.data.slug
    });
    assert.equal(publicDetail.data.id, created.data.id);

    await registerCandidate({
      email: candidateEmail,
      requestId: createRequestId('job-candidate-register')
    });

    const candidateLogin = await login({
      email: candidateEmail,
      password: '12345678',
      requestId: createRequestId('job-candidate-login')
    });

    const saved = await saveJob({
      accessToken: candidateLogin.accessToken,
      jobId: created.data.id,
      requestId: createRequestId('job-save')
    });
    assert.equal(saved.data.jobId, created.data.id);
    assert.equal(saved.data.job?.title, created.data.title);
    assert.equal(saved.data.job?.slug, created.data.slug);

    const savedJobs = await listSavedJobs({
      accessToken: candidateLogin.accessToken,
      requestId: createRequestId('job-saved-list')
    });
    const enriched = savedJobs.data.find((item) => item.jobId === created.data.id);
    assert.ok(enriched?.job?.companyName);
    assert.equal(enriched?.job?.title, created.data.title);
  }
);
