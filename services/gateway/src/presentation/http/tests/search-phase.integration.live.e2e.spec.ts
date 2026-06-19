import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmployerJob,
  publishEmployerJob,
  searchPublicJobs
} from './helpers/live-gateway-jobs';
import {
  login,
  registerEmployer
} from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { pollUntil } from './helpers/live-polling';

test(
  'search phase integration exposes newly published jobs through keyword search',
  { timeout: 90_000 },
  async () => {
    const employerEmail = createUniqueEmail('search.phase.employer');
    const jobTitle = `Search Integration Job ${Date.now()}`;

    await registerEmployer({
      email: employerEmail,
      requestId: createRequestId('search-employer-register')
    });

    const employerLogin = await login({
      email: employerEmail,
      password: '12345678',
      requestId: createRequestId('search-employer-login')
    });
    assert.equal(employerLogin.response.status, 200);

    const created = await createEmployerJob({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('search-job-create'),
      title: jobTitle
    });
    assert.equal(created.data.status, 'draft');

    const published = await publishEmployerJob({
      accessToken: employerLogin.accessToken,
      jobId: created.data.id,
      requestId: createRequestId('search-job-publish')
    });
    assert.equal(published.data.status, 'published');

    const searchResult = await pollUntil(async () => {
      const response = await searchPublicJobs({
        keyword: jobTitle,
        requestId: createRequestId('search-public-jobs')
      });

      return response.data.items.some((job) => job.id === created.data.id) ? response : null;
    }, { intervalMs: 500, timeoutMs: 20_000 });

    const matchedJob = searchResult.data.items.find((job) => job.id === created.data.id);
    assert.ok(matchedJob);
    assert.equal(matchedJob?.title, jobTitle);
    assert.equal(matchedJob?.status, 'published');
  }
);
