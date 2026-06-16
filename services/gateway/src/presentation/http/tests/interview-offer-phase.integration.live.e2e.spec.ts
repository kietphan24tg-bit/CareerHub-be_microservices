import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyToJob,
  getApplicationHistory,
  getAtsBoard,
  getCandidateApplication,
  getEmployerApplication
} from './helpers/live-gateway-applications';
import {
  createOrGetTemplateDraft,
  listResumeTemplates
} from './helpers/live-gateway-candidate';
import {
  acceptOffer,
  cancelInterview,
  confirmInterview,
  createInterview,
  createOffer,
  declineInterview,
  declineOffer,
  getCandidateInterview,
  getCandidateOffer,
  getEmployerOffer,
  listBenefitCatalog,
  listCandidateOffersForApplication,
  listEmployerInterviews,
  requestReschedule,
  sendOffer,
  updateInterview,
  updateOffer,
  withdrawOffer
} from './helpers/live-gateway-interviews-offers';
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
import { pollUntil, sleep } from './helpers/live-polling';
import { startLocalSmtpSink } from './helpers/live-smtp-sink';

const DEFAULT_TEMPLATE_ID = 'resume-template-classic-1';
const INTERVIEW_DATE = '2026-12-15';
const OFFER_EXPIRES_AT = '2026-12-31';
const OFFER_START_DATE = '2027-01-15';

async function setupAppliedApplication() {
  const employerEmail = createUniqueEmail('interview.offer.employer');
  const candidateEmail = createUniqueEmail('interview.offer.candidate');

  await registerEmployer({
    email: employerEmail,
    requestId: createRequestId('interview-offer-employer-register')
  });

  const employerLogin = await login({
    email: employerEmail,
    password: '12345678',
    requestId: createRequestId('interview-offer-employer-login')
  });
  assert.equal(employerLogin.response.status, 200);

  const created = await createEmployerJob({
    accessToken: employerLogin.accessToken,
    requestId: createRequestId('interview-offer-job-create'),
    title: `Interview Offer Integration Job ${Date.now()}`
  });
  assert.equal(created.data.status, 'draft');

  const published = await publishEmployerJob({
    accessToken: employerLogin.accessToken,
    jobId: created.data.id,
    requestId: createRequestId('interview-offer-job-publish')
  });
  assert.equal(published.data.status, 'published');

  await registerCandidate({
    email: candidateEmail,
    requestId: createRequestId('interview-offer-candidate-register')
  });

  const candidateLogin = await login({
    email: candidateEmail,
    password: '12345678',
    requestId: createRequestId('interview-offer-candidate-login')
  });
  assert.equal(candidateLogin.response.status, 200);

  const templates = await listResumeTemplates({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('interview-offer-resume-templates')
  });
  assert.ok(templates.data.length > 0);

  const templateId = templates.data[0]?.id ?? DEFAULT_TEMPLATE_ID;
  const draft = await createOrGetTemplateDraft({
    accessToken: candidateLogin.accessToken,
    requestId: createRequestId('interview-offer-resume-draft'),
    templateId
  });
  assert.ok(draft.data.id.length > 0);

  const applied = await applyToJob({
    accessToken: candidateLogin.accessToken,
    coverLetter: 'Ready for interview and offer flow.',
    jobId: published.data.id,
    requestId: createRequestId('interview-offer-apply'),
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

async function scheduleInterviewAndSendOffer(input: {
  accessToken: string;
  applicationId: string;
  candidateAccessToken: string;
  requestIdPrefix: string;
}) {
  const catalog = await listBenefitCatalog({
    accessToken: input.accessToken,
    requestId: createRequestId(`${input.requestIdPrefix}-catalog`)
  });
  assert.ok(catalog.data.some((item) => item.code === 'annual_leave'));

  const interview = await createInterview({
    accessToken: input.accessToken,
    applicationId: input.applicationId,
    payload: {
      date: INTERVIEW_DATE,
      durationMinutes: 60,
      meetingLink: 'https://meet.example.com/live-e2e',
      platform: 'Google Meet',
      round: 'Technical',
      startTime: '10:00',
      timezone: 'Asia/Ho_Chi_Minh',
      type: 'online'
    },
    requestId: createRequestId(`${input.requestIdPrefix}-create-interview`)
  });
  assert.equal(interview.data.status, 'scheduled');

  const employerInterviews = await listEmployerInterviews({
    accessToken: input.accessToken,
    requestId: createRequestId(`${input.requestIdPrefix}-list-interviews`)
  });
  assert.ok(employerInterviews.data.some((item) => item.id === interview.data.id));

  const candidateInterview = await getCandidateInterview({
    accessToken: input.candidateAccessToken,
    applicationId: input.applicationId,
    requestId: createRequestId(`${input.requestIdPrefix}-candidate-interview`)
  });
  assert.equal(candidateInterview.data.id, interview.data.id);

  const confirmed = await confirmInterview({
    accessToken: input.candidateAccessToken,
    interviewId: interview.data.id,
    note: 'Confirmed for live e2e',
    requestId: createRequestId(`${input.requestIdPrefix}-confirm-interview`)
  });
  assert.equal(confirmed.data.status, 'confirmed');

  const draftOffer = await createOffer({
    accessToken: input.accessToken,
    applicationId: input.applicationId,
    payload: {
      currency: 'USD',
      offerExpiresAt: OFFER_EXPIRES_AT,
      salary: 5000,
      startDate: OFFER_START_DATE,
      title: 'Senior Engineer Offer'
    },
    requestId: createRequestId(`${input.requestIdPrefix}-create-offer`)
  });
  assert.equal(draftOffer.data.status, 'draft');

  const sentOffer = await sendOffer({
    accessToken: input.accessToken,
    offerId: draftOffer.data.id,
    requestId: createRequestId(`${input.requestIdPrefix}-send-offer`)
  });
  assert.equal(sentOffer.data.status, 'sent');

  const employerOffer = await getEmployerOffer({
    accessToken: input.accessToken,
    offerId: draftOffer.data.id,
    requestId: createRequestId(`${input.requestIdPrefix}-employer-offer`)
  });
  assert.equal(employerOffer.data.status, 'sent');

  const candidateOffers = await listCandidateOffersForApplication({
    accessToken: input.candidateAccessToken,
    applicationId: input.applicationId,
    requestId: createRequestId(`${input.requestIdPrefix}-candidate-offers-list`)
  });
  assert.ok(candidateOffers.data.some((item) => item.id === draftOffer.data.id));

  const viewedOffer = await getCandidateOffer({
    accessToken: input.candidateAccessToken,
    offerId: draftOffer.data.id,
    requestId: createRequestId(`${input.requestIdPrefix}-candidate-offer-view`)
  });
  assert.equal(viewedOffer.data.status, 'viewed');

  return {
    interviewId: interview.data.id,
    offerId: draftOffer.data.id
  };
}

test(
  'interview offer phase integration covers interview, offer send, accept, and hired status',
  { timeout: 180_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin, job } = await setupAppliedApplication();
    const smtpSink = await startLocalSmtpSink();

    try {
      const { offerId } = await scheduleInterviewAndSendOffer({
        accessToken: employerLogin.accessToken,
        applicationId,
        candidateAccessToken: candidateLogin.accessToken,
        requestIdPrefix: 'interview-offer-accept'
      });

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub interview invitation') ? true : null;
      });
      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub job offer received') ? true : null;
      });

      const employerApplication = await getEmployerApplication({
        accessToken: employerLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-employer-app-offer-stage')
      });
      assert.equal(employerApplication.data.status, 'offer');
      assert.ok(employerApplication.data.interview?.id);
      assert.ok(employerApplication.data.offer?.id);

      const accepted = await acceptOffer({
        accessToken: candidateLogin.accessToken,
        note: 'Happy to join the team',
        offerId,
        requestId: createRequestId('interview-offer-accept')
      });
      assert.equal(accepted.data.status, 'accepted');

      const hiredApplication = await getCandidateApplication({
        accessToken: candidateLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-candidate-hired')
      });
      assert.equal(hiredApplication.data.status, 'hired');
      assert.equal(hiredApplication.data.offer?.status, 'accepted');

      const history = await getApplicationHistory({
        accessToken: employerLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-history')
      });
      const eventTypes = history.data.map((item) => item.eventType);
      assert.ok(eventTypes.includes('interview_scheduled'));
      assert.ok(eventTypes.includes('offer_sent'));
      assert.ok(eventTypes.includes('offer_viewed'));
      assert.ok(eventTypes.includes('offer_accepted'));

      const atsBoard = await getAtsBoard({
        accessToken: employerLogin.accessToken,
        jobId: job.id,
        requestId: createRequestId('interview-offer-ats-board')
      });
      assert.ok(
        atsBoard.data.applications.some((application) => application.stage === 'hired')
      );
    } finally {
      await smtpSink.close();
    }
  }
);

test(
  'interview offer phase integration covers offer decline and rejected status',
  { timeout: 180_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin } = await setupAppliedApplication();
    const smtpSink = await startLocalSmtpSink();

    try {
      const { offerId } = await scheduleInterviewAndSendOffer({
        accessToken: employerLogin.accessToken,
        applicationId,
        candidateAccessToken: candidateLogin.accessToken,
        requestIdPrefix: 'interview-offer-decline'
      });

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub job offer received') ? true : null;
      });

      const declined = await declineOffer({
        accessToken: candidateLogin.accessToken,
        note: 'Compensation below expectation',
        offerId,
        requestId: createRequestId('interview-offer-decline')
      });
      assert.equal(declined.data.status, 'rejected');

      const rejectedApplication = await getCandidateApplication({
        accessToken: candidateLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-candidate-rejected')
      });
      assert.equal(rejectedApplication.data.status, 'rejected');
      assert.equal(rejectedApplication.data.offer?.status, 'rejected');

      const history = await getApplicationHistory({
        accessToken: employerLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-decline-history')
      });
      assert.ok(history.data.some((item) => item.eventType === 'offer_rejected'));
    } finally {
      await smtpSink.close();
    }
  }
);

test(
  'interview offer phase integration covers interview reschedule, cancel, and mail delivery',
  { timeout: 180_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin } = await setupAppliedApplication();
    const smtpSink = await startLocalSmtpSink();

    try {
      const createdInterview = await createInterview({
        accessToken: employerLogin.accessToken,
        applicationId,
        payload: {
          date: INTERVIEW_DATE,
          durationMinutes: 60,
          meetingLink: 'https://meet.example.com/live-e2e-reschedule',
          platform: 'Google Meet',
          round: 'Technical',
          startTime: '10:00',
          timezone: 'Asia/Ho_Chi_Minh',
          type: 'online'
        },
        requestId: createRequestId('interview-offer-mail-create-interview')
      });
      assert.equal(createdInterview.data.status, 'scheduled');

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub interview invitation') ? true : null;
      });

      const rescheduled = await updateInterview({
        accessToken: employerLogin.accessToken,
        interviewId: createdInterview.data.id,
        payload: {
          date: '2026-12-16',
          round: createdInterview.data.round,
          startTime: '11:00',
          type: createdInterview.data.type
        },
        requestId: createRequestId('interview-offer-mail-reschedule')
      });
      assert.equal(rescheduled.data.status, 'rescheduled');

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub interview schedule updated') ? true : null;
      });

      const cancelled = await cancelInterview({
        accessToken: employerLogin.accessToken,
        interviewId: createdInterview.data.id,
        reason: 'Live e2e cancellation',
        requestId: createRequestId('interview-offer-mail-cancel')
      });
      assert.equal(cancelled.data.status, 'cancelled');

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub interview cancelled') ? true : null;
      });

      const candidateApp = await getCandidateApplication({
        accessToken: candidateLogin.accessToken,
        applicationId,
        requestId: createRequestId('interview-offer-mail-candidate-app')
      });
      assert.ok(candidateApp.data.interview?.id);
    } finally {
      await smtpSink.close();
    }
  }
);

test(
  'interview offer phase integration ensures candidate interview responses do not send mail',
  { timeout: 180_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin } = await setupAppliedApplication();
    const smtpSink = await startLocalSmtpSink();

    try {
      const interview = await createInterview({
        accessToken: employerLogin.accessToken,
        applicationId,
        payload: {
          date: INTERVIEW_DATE,
          durationMinutes: 60,
          meetingLink: 'https://meet.example.com/live-e2e-no-mail',
          platform: 'Google Meet',
          round: 'Technical',
          startTime: '10:00',
          timezone: 'Asia/Ho_Chi_Minh',
          type: 'online'
        },
        requestId: createRequestId('interview-offer-no-mail-create-interview')
      });

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub interview invitation') ? true : null;
      });

      const baselineCount = smtpSink.messages.length;

      const requested = await requestReschedule({
        accessToken: candidateLogin.accessToken,
        interviewId: interview.data.id,
        payload: {
          proposedDate: '2026-12-17',
          proposedStartTime: '14:00',
          proposedDurationMinutes: 45,
          proposedTimezone: 'Asia/Ho_Chi_Minh',
          candidateResponseNote: 'Requesting different time'
        },
        requestId: createRequestId('interview-offer-no-mail-request-reschedule')
      });
      assert.equal(requested.data.status, 'rescheduled');

      const declined = await declineInterview({
        accessToken: candidateLogin.accessToken,
        interviewId: interview.data.id,
        note: 'Cannot attend',
        requestId: createRequestId('interview-offer-no-mail-decline-interview')
      });
      assert.equal(declined.data.status, 'cancelled');

      await sleep(2_000);
      assert.equal(smtpSink.messages.length, baselineCount);
    } finally {
      await smtpSink.close();
    }
  }
);

test(
  'interview offer phase integration ensures offer update and withdraw do not send mail',
  { timeout: 180_000 },
  async () => {
    const { applicationId, candidateLogin, employerLogin } = await setupAppliedApplication();
    const smtpSink = await startLocalSmtpSink();

    try {
      const { offerId } = await scheduleInterviewAndSendOffer({
        accessToken: employerLogin.accessToken,
        applicationId,
        candidateAccessToken: candidateLogin.accessToken,
        requestIdPrefix: 'interview-offer-no-mail-offer-mutations'
      });

      await pollUntil(async () => {
        const message = smtpSink.messages.join('\n');
        return message.includes('CareerHub job offer received') ? true : null;
      });

      const baselineCount = smtpSink.messages.length;

      const updated = await updateOffer({
        accessToken: employerLogin.accessToken,
        offerId,
        payload: { message: 'Updated terms - live e2e', title: 'Senior Engineer Offer' },
        requestId: createRequestId('interview-offer-no-mail-update-offer')
      });
      assert.ok(updated.data.id.length > 0);

      await withdrawOffer({
        accessToken: employerLogin.accessToken,
        offerId,
        requestId: createRequestId('interview-offer-no-mail-withdraw-offer')
      });

      await sleep(2_000);
      assert.equal(smtpSink.messages.length, baselineCount);
    } finally {
      await smtpSink.close();
    }
  }
);
