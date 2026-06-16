import assert from 'node:assert/strict';
import test from 'node:test';
import { createIntegrationEvent } from '../rabbitmq-event';
import {
  MAIL_INTERVIEW_CREATED_EVENT_NAME,
  MAIL_INTERVIEW_UPDATED_EVENT_NAME,
  MAIL_OFFER_SENT_EVENT_NAME,
  isRecruitmentMailEvent,
  isRecruitmentMailInterviewEvent,
  isRecruitmentMailOfferEvent,
  isKnownRecruitmentMailEventName
} from './recruitment-mail.event';

const interviewPayload = {
  appUrl: 'http://localhost:4000/candidate/interviews/interview-1',
  companyName: 'Acme Corp',
  date: '2026-06-20',
  endTime: '11:00',
  interviewId: 'interview-1',
  jobTitle: 'Software Engineer',
  meetingLink: 'https://meet.example.com',
  platform: 'Google Meet',
  preview: 'A new interview invitation is available in your CareerHub account.',
  recipientIdentityId: 'candidate-1',
  sourceEventId: 'mail-event-1',
  startTime: '10:00',
  subject: 'CareerHub interview invitation',
  timezone: 'Asia/Ho_Chi_Minh',
  type: 'online'
};

const offerPayload = {
  appUrl: 'http://localhost:4000/candidate/offers/offer-1',
  benefits: [
    {
      amount: null,
      annualLeaveDays: 12,
      currency: null,
      description: null,
      frequency: null,
      hasMonetaryValue: false,
      name: null,
      type: 'annual_leave'
    }
  ],
  bonusDetails: 'Performance bonus',
  companyName: 'Acme Corp',
  contractDocumentUrl: 'https://example.com/contract.pdf',
  currency: 'USD',
  departmentTeam: 'Engineering',
  employmentType: 'full_time',
  expiresAt: '2026-07-01T00:00:00.000Z',
  location: 'Ho Chi Minh City',
  message: 'Welcome aboard',
  offerId: 'offer-1',
  preview: 'A new job offer is available in your CareerHub account.',
  probationCustom: null,
  probationType: 'two_months',
  recipientIdentityId: 'candidate-1',
  reportingTo: 'CTO',
  salary: '3000',
  salaryPeriod: 'monthly',
  seniorityLabel: 'Senior',
  sourceEventId: 'mail-event-2',
  startDate: '2026-08-01',
  subject: 'CareerHub job offer received',
  title: 'Software Engineer',
  workModel: 'hybrid'
};

test('isKnownRecruitmentMailEventName recognizes recruitment mail routing keys', () => {
  assert.equal(isKnownRecruitmentMailEventName(MAIL_INTERVIEW_CREATED_EVENT_NAME), true);
  assert.equal(isKnownRecruitmentMailEventName(MAIL_OFFER_SENT_EVENT_NAME), true);
  assert.equal(isKnownRecruitmentMailEventName('notifications.offer-sent.v1'), false);
});

test('isRecruitmentMailInterviewEvent validates interview mail integration events', () => {
  const event = createIntegrationEvent(
    MAIL_INTERVIEW_CREATED_EVENT_NAME,
    interviewPayload,
    'req-1'
  );

  assert.equal(isRecruitmentMailInterviewEvent(event), true);
  assert.equal(isRecruitmentMailEvent(event), true);
  assert.equal(
    isRecruitmentMailInterviewEvent({ ...event, name: MAIL_INTERVIEW_UPDATED_EVENT_NAME }),
    true
  );
  assert.equal(
    isRecruitmentMailInterviewEvent({
      ...event,
      payload: { ...event.payload, recipientIdentityId: 1 }
    }),
    false
  );
});

test('isRecruitmentMailOfferEvent validates offer mail integration events', () => {
  const event = createIntegrationEvent(MAIL_OFFER_SENT_EVENT_NAME, offerPayload, 'req-2');

  assert.equal(isRecruitmentMailOfferEvent(event), true);
  assert.equal(isRecruitmentMailEvent(event), true);
  assert.equal(
    isRecruitmentMailOfferEvent({
      ...event,
      payload: { ...event.payload, benefits: 'invalid' }
    }),
    false
  );
});
