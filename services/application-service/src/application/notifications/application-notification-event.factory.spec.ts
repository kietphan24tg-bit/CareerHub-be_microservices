import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME,
  NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME,
  NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME,
  NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME,
  NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME,
  NOTIFICATION_OFFER_DECLINED_EVENT_NAME,
  NOTIFICATION_OFFER_SENT_EVENT_NAME,
  NOTIFICATION_OFFER_UPDATED_EVENT_NAME,
  NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME
} from '@careerhub/contracts';
import { ApplicationNotificationEventFactory } from './application-notification-event.factory';

const factory = new ApplicationNotificationEventFactory({
  createSourceEventId: () => 'source-event-1'
});

const baseApplication = {
  candidateIdentityId: 'candidate-1',
  coverLetter: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  employerIdentityId: 'employer-1',
  id: 'application-1',
  jobId: 'job-1',
  resumeId: 'resume-1',
  status: 'applied' as const,
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const baseInterview = {
  applicationId: 'application-1',
  callerInfo: null,
  candidateIdentityId: 'candidate-1',
  candidateProposedDate: null,
  candidateProposedDurationMinutes: null,
  candidateProposedStartTime: null,
  candidateProposedTimezone: null,
  candidateResponseNote: null,
  contactInfo: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  date: '2026-12-15',
  durationMinutes: 60,
  employerIdentityId: 'employer-1',
  endTime: '11:00',
  fullAddress: null,
  id: 'interview-1',
  interviewerName: null,
  interviewerRole: null,
  interviewers: [],
  jobId: 'job-1',
  locationDetail: null,
  locationLat: null,
  locationLng: null,
  logisticsNote: null,
  mapLink: null,
  meetingId: null,
  meetingLink: null,
  notesToCandidate: null,
  officeName: null,
  passcode: null,
  phoneNumber: null,
  platform: null,
  round: 'Technical',
  scheduledByIdentityId: 'employer-1',
  startTime: '10:00',
  status: 'scheduled',
  timezone: null,
  type: 'online',
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const baseOffer = {
  applicationId: 'application-1',
  benefits: [],
  bonusDetails: null,
  candidateIdentityId: 'candidate-1',
  contractDocumentUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdByIdentityId: 'employer-1',
  currency: 'USD',
  deletedAt: null,
  departmentTeam: null,
  employerIdentityId: 'employer-1',
  employmentType: 'full_time',
  expiresAt: new Date('2026-12-31T23:59:59.000Z'),
  id: 'offer-1',
  jobId: 'job-1',
  location: null,
  message: null,
  probationCustom: null,
  probationType: null,
  reportingTo: null,
  respondedAt: null,
  salary: '5000',
  salaryPeriod: 'monthly',
  seniorityLabel: null,
  sentAt: null,
  startDate: null,
  status: 'sent',
  title: 'Senior Engineer',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  viewedAt: null,
  workModel: 'hybrid'
};

test('buildApplicationReceivedEvent maps employer recipient and canonical metadata', () => {
  const event = factory.buildApplicationReceivedEvent({
    actorIdentityId: 'candidate-1',
    application: baseApplication,
    requestId: 'req-1'
  });

  assert.equal(event.name, NOTIFICATION_APPLICATION_RECEIVED_EVENT_NAME);
  assert.equal(event.payload.recipientIdentityId, 'employer-1');
  assert.equal(event.payload.type, 'application_received');
  assert.equal(event.requestId, 'req-1');
  assert.equal(event.payload.sourceEventId, 'source-event-1');
  assert.deepEqual(event.payload.metadata, {
    action: 'applied',
    actorUserId: 'candidate-1',
    applicationId: 'application-1',
    candidateUserId: 'candidate-1',
    employerIdentityId: 'employer-1',
    jobId: 'job-1',
    resumeId: 'resume-1'
  });
  assert.equal('companyId' in event.payload.metadata, false);
});

test('buildApplicationStatusChangedEvent maps status transition metadata', () => {
  const event = factory.buildApplicationStatusChangedEvent({
    application: baseApplication,
    newStatus: 'shortlisted',
    oldStatus: 'applied',
    requestId: 'req-2'
  });

  assert.equal(event.name, NOTIFICATION_APPLICATION_STATUS_CHANGED_EVENT_NAME);
  assert.equal(event.payload.recipientIdentityId, 'candidate-1');
  assert.deepEqual(event.payload.metadata, {
    actorUserId: 'employer-1',
    applicationId: 'application-1',
    candidateUserId: 'candidate-1',
    employerIdentityId: 'employer-1',
    jobId: 'job-1',
    newStatus: 'shortlisted',
    oldStatus: 'applied'
  });
});

test('buildInterviewScheduledEvent maps candidate recipient', () => {
  const event = factory.buildInterviewScheduledEvent({
    actorIdentityId: 'employer-1',
    interview: baseInterview
  });

  assert.equal(event?.name, NOTIFICATION_INTERVIEW_SCHEDULED_EVENT_NAME);
  assert.equal(event?.payload.recipientIdentityId, 'candidate-1');
  assert.equal(event?.payload.type, 'interview_scheduled');
  assert.deepEqual(event?.payload.metadata, {
    action: 'scheduled',
    actorUserId: 'employer-1',
    applicationId: 'application-1',
    employerIdentityId: 'employer-1',
    interviewId: 'interview-1',
    jobId: 'job-1'
  });
});

test('buildInterviewStatusChangedEvent maps employer recipient for candidate action', () => {
  const event = factory.buildInterviewStatusChangedEvent({
    action: 'confirmed',
    actorIdentityId: 'candidate-1',
    interview: baseInterview,
    recipientRole: 'employer'
  });

  assert.equal(event?.name, NOTIFICATION_INTERVIEW_STATUS_CHANGED_EVENT_NAME);
  assert.equal(event?.payload.recipientIdentityId, 'employer-1');
  assert.equal(event?.payload.metadata.action, 'confirmed');
});

test('buildOfferSentEvent maps candidate recipient and kind metadata', () => {
  const event = factory.buildOfferSentEvent({
    actorIdentityId: 'employer-1',
    offer: baseOffer
  });

  assert.equal(event.name, NOTIFICATION_OFFER_SENT_EVENT_NAME);
  assert.equal(event.payload.recipientIdentityId, 'candidate-1');
  assert.equal(event.payload.type, 'offer_sent');
  assert.deepEqual(event.payload.metadata, {
    actorUserId: 'employer-1',
    applicationId: 'application-1',
    employerIdentityId: 'employer-1',
    jobId: 'job-1',
    kind: 'sent',
    offerId: 'offer-1'
  });
});

test('buildOfferUpdatedEvent maps updated kind', () => {
  const event = factory.buildOfferUpdatedEvent({
    actorIdentityId: 'employer-1',
    offer: baseOffer
  });

  assert.equal(event.name, NOTIFICATION_OFFER_UPDATED_EVENT_NAME);
  assert.equal(event.payload.metadata.kind, 'updated');
});

test('buildOfferWithdrawnEvent maps withdrawn kind', () => {
  const event = factory.buildOfferWithdrawnEvent({
    actorIdentityId: 'employer-1',
    offer: baseOffer
  });

  assert.equal(event.name, NOTIFICATION_OFFER_WITHDRAWN_EVENT_NAME);
  assert.equal(event.payload.metadata.kind, 'withdrawn');
});

test('buildOfferAcceptedEvent maps employer recipient', () => {
  const event = factory.buildOfferAcceptedEvent({
    actorIdentityId: 'candidate-1',
    offer: baseOffer
  });

  assert.equal(event.name, NOTIFICATION_OFFER_ACCEPTED_EVENT_NAME);
  assert.equal(event.payload.recipientIdentityId, 'employer-1');
  assert.equal(event.payload.metadata.kind, 'accepted');
});

test('buildOfferDeclinedEvent maps employer recipient', () => {
  const event = factory.buildOfferDeclinedEvent({
    actorIdentityId: 'candidate-1',
    offer: baseOffer
  });

  assert.equal(event.name, NOTIFICATION_OFFER_DECLINED_EVENT_NAME);
  assert.equal(event.payload.recipientIdentityId, 'employer-1');
  assert.equal(event.payload.metadata.kind, 'declined');
});
