import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationInterviewRecord, ApplicationOfferRecord } from '../ports';
import { ApplicationMailContextQuery } from './application-mail-context.query';
import { ApplicationMailEventFactory } from './application-mail-event.factory';

const interview: ApplicationInterviewRecord = {
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
  date: '2026-06-20',
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
  meetingLink: 'https://meet.example.com',
  notesToCandidate: null,
  officeName: null,
  passcode: null,
  phoneNumber: null,
  platform: 'Google Meet',
  round: 'Technical',
  scheduledByIdentityId: 'employer-1',
  startTime: '10:00',
  status: 'scheduled',
  timezone: 'Asia/Ho_Chi_Minh',
  type: 'online',
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const offer: ApplicationOfferRecord = {
  applicationId: 'application-1',
  benefits: [],
  bonusDetails: null,
  candidateIdentityId: 'candidate-1',
  contractDocumentUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdByIdentityId: 'employer-1',
  currency: 'USD',
  deletedAt: null,
  departmentTeam: 'Engineering',
  employerIdentityId: 'employer-1',
  employmentType: 'full_time',
  expiresAt: new Date('2026-07-01T00:00:00.000Z'),
  id: 'offer-1',
  jobId: 'job-1',
  location: 'Ho Chi Minh City',
  message: null,
  probationCustom: null,
  probationType: 'two_months',
  reportingTo: null,
  respondedAt: null,
  salary: '3000',
  salaryPeriod: 'monthly',
  seniorityLabel: 'Senior',
  sentAt: new Date('2026-06-01T00:00:00.000Z'),
  startDate: '2026-08-01',
  status: 'sent',
  title: 'Software Engineer',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  viewedAt: null,
  workModel: 'hybrid'
};

function createFactory() {
  const mailContextQuery = new ApplicationMailContextQuery({
    appBaseUrl: 'http://localhost:4000',
    jobMailContextLookup: {
      async findByJobId() {
        return {
          companyName: 'Acme Corp',
          jobTitle: 'Software Engineer'
        };
      }
    }
  });

  return new ApplicationMailEventFactory({
    createSourceEventId: () => 'mail-source-1',
    mailContextQuery
  });
}

test('buildInterviewCreatedMailEvent uses monolith subject and preview', async () => {
  const factory = createFactory();
  const event = await factory.buildInterviewCreatedMailEvent({ interview });

  assert.equal(event?.name, 'mail.interview-created.v1');
  assert.equal(event?.payload.subject, 'CareerHub interview invitation');
  assert.equal(
    event?.payload.preview,
    'A new interview invitation is available in your CareerHub account.'
  );
  assert.equal(event?.payload.recipientIdentityId, 'candidate-1');
  assert.equal(event?.payload.appUrl, 'http://localhost:4000/candidate/interviews/interview-1');
  assert.equal(event?.payload.companyName, 'Acme Corp');
});

test('buildInterviewUpdatedMailEvent uses updated schedule copy', async () => {
  const factory = createFactory();
  const event = await factory.buildInterviewUpdatedMailEvent({ interview });

  assert.equal(event?.name, 'mail.interview-updated.v1');
  assert.equal(event?.payload.subject, 'CareerHub interview schedule updated');
});

test('buildOfferSentMailEvent includes rich offer payload', async () => {
  const factory = createFactory();
  const event = await factory.buildOfferSentMailEvent({ offer });

  assert.equal(event.name, 'mail.offer-sent.v1');
  assert.equal(event.payload.subject, 'CareerHub job offer received');
  assert.equal(event.payload.title, 'Software Engineer');
  assert.equal(event.payload.companyName, 'Acme Corp');
  assert.equal(event.payload.appUrl, 'http://localhost:4000/candidate/offers/offer-1');
});
