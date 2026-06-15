import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyToJob,
  updateApplicationStatus
} from './helpers/live-gateway-applications';
import {
  createOrGetTemplateDraft,
  listResumeTemplates
} from './helpers/live-gateway-candidate';
import {
  createRecruiterNote,
  deleteRecruiterNote,
  getEmployerDashboard,
  listNotifications,
  listRecruiterNotes,
  markAllNotificationsRead,
  markNotificationRead,
  updateRecruiterNote
} from './helpers/live-gateway-gap-closure';
import {
  createEmployerJob,
  publishEmployerJob
} from './helpers/live-gateway-jobs';
import {
  login,
  registerCandidate,
  registerEmployer
} from './helpers/live-gateway-auth';
import { createRequestId, createUniqueEmail } from './helpers/live-http';
import { pollUntil } from './helpers/live-polling';

const DEFAULT_TEMPLATE_ID = 'resume-template-classic-1';

async function setupAppliedApplication() {
  const employerEmail = createUniqueEmail('gap-closure.employer');
  const candidateEmail = createUniqueEmail('gap-closure.candidate');

  await registerEmployer({
    email: employerEmail,
    requestId: createRequestId('gap-closure-employer-register')
  });

  const employerLogin = await login({
    email: employerEmail,
    password: '12345678',
    requestId: createRequestId('gap-closure-employer-login')
  });
  assert.equal(employerLogin.response.status, 200);

  const created = await createEmployerJob({
    accessToken: employerLogin.accessToken,
    requestId: createRequestId('gap-closure-job-create'),
    title: `Gap Closure Job ${Date.now()}`
  });
  assert.equal(created.data.status, 'draft');

  const published = await publishEmployerJob({
    accessToken: employerLogin.accessToken,
    jobId: created.data.id,
    requestId: createRequestId('gap-closure-job-publish')
  });
  assert.equal(published.data.status, 'published');

  await registerCandidate({
    email: candidateEmail,
    requestId: createRequestId('gap-closure-candidate-register')
  });

  const candidateLogin = await login({
    email: candidateEmail,
    password: '12345678',
    requestId: createRequestId('gap-closure-candidate-login')
  });
  assert.equal(candidateLogin.response.status, 200);

  const templates = await listResumeTemplates({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('gap-closure-resume-templates')
  });
  assert.ok(templates.data.length > 0);

  const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;
  const draft = await createOrGetTemplateDraft({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('gap-closure-resume-draft'),
    templateId
  });
  assert.ok(draft.data.id.length > 0);

  const applied = await applyToJob({
    accessToken: candidateLogin.accessToken,
    coverLetter: 'Gap closure integration apply.',
    jobId: published.data.id,
    requestId: createRequestId('gap-closure-apply'),
    resumeId: draft.data.id
  });
  assert.equal(applied.data.status, 'applied');

  return {
    applicationId: applied.data.id,
    candidateLogin,
    employerLogin,
    job: published.data
  };
}

test(
  'gap closure integration covers dashboard, recruiter notes, and notification dispatch',
  { timeout: 120_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin, job } =
      await setupAppliedApplication();

    const dashboard = await getEmployerDashboard({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('gap-closure-dashboard')
    });
    assert.ok(typeof dashboard.data.summary.activeJobs === 'number');
    assert.ok(typeof dashboard.data.summary.totalApplicants === 'number');
    assert.ok(Array.isArray(dashboard.data.pipeline));
    assert.ok(Array.isArray(dashboard.data.priorityJobs));
    assert.ok(
      dashboard.data.pipeline.some(
        (item) => String(item.applicationId) === applicationId || item.jobId === job.id
      ) || dashboard.data.summary.totalApplicants >= 1
    );

    const createdNote = await createRecruiterNote({
      accessToken: employerLogin.accessToken,
      applicationId,
      body: 'Strong backend profile.',
      requestId: createRequestId('gap-closure-note-create')
    });
    assert.equal(createdNote.data.body, 'Strong backend profile.');
    assert.ok(createdNote.data.authorUserId.length > 0);
    assert.ok(
      createdNote.data.authorName === null || createdNote.data.authorName.length > 0
    );

    const notes = await listRecruiterNotes({
      accessToken: employerLogin.accessToken,
      applicationId,
      requestId: createRequestId('gap-closure-note-list')
    });
    assert.equal(notes.data.length, 1);
    assert.equal(notes.data[0]?.id, createdNote.data.id);

    const updatedNote = await updateRecruiterNote({
      accessToken: employerLogin.accessToken,
      body: 'Strong backend profile with microservices experience.',
      noteId: createdNote.data.id,
      requestId: createRequestId('gap-closure-note-update')
    });
    assert.equal(updatedNote.data.body, 'Strong backend profile with microservices experience.');

    await deleteRecruiterNote({
      accessToken: employerLogin.accessToken,
      noteId: createdNote.data.id,
      requestId: createRequestId('gap-closure-note-delete')
    });

    const notesAfterDelete = await listRecruiterNotes({
      accessToken: employerLogin.accessToken,
      applicationId,
      requestId: createRequestId('gap-closure-note-list-after-delete')
    });
    assert.equal(notesAfterDelete.data.length, 0);

    const employerNotifications = await pollUntil(async () => {
      const response = await listNotifications({
        accessToken: employerLogin.accessToken,
        requestId: createRequestId('gap-closure-employer-notifications')
      });

      const match = response.data.notifications.find(
        (notification) => notification.type === 'application_received'
      );

      return match ?? null;
    });
    assert.equal(employerNotifications.type, 'application_received');

    await updateApplicationStatus({
      accessToken: employerLogin.accessToken,
      applicationId,
      requestId: createRequestId('gap-closure-status-reviewed'),
      status: 'reviewed'
    });

    const candidateNotification = await pollUntil(async () => {
      const response = await listNotifications({
        accessToken: candidateLogin.accessToken,
        requestId: createRequestId('gap-closure-candidate-notifications')
      });

      const match = response.data.notifications.find(
        (notification) => notification.type === 'application_status_changed'
      );

      return match ?? null;
    });
    assert.equal(candidateNotification.type, 'application_status_changed');
    assert.equal(candidateNotification.title, 'Application reviewed');

    const markedRead = await markNotificationRead({
      accessToken: candidateLogin.accessToken,
      notificationId: candidateNotification.id,
      requestId: createRequestId('gap-closure-mark-read')
    });
    assert.ok(markedRead.data.notification.readAt);

    await markAllNotificationsRead({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('gap-closure-mark-all-read')
    });

    const employerAfterReadAll = await listNotifications({
      accessToken: employerLogin.accessToken,
      requestId: createRequestId('gap-closure-employer-notifications-after-read-all')
    });
    assert.equal(employerAfterReadAll.data.unreadCount, 0);
  }
);
