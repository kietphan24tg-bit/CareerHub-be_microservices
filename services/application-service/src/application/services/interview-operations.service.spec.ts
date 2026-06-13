import assert from 'node:assert/strict';
import test from 'node:test';
import { InterviewApplicationStateInvalidError } from '../errors/interview-application-state-invalid.error';
import { InterviewNotFoundError } from '../errors/interview-not-found.error';
import { InterviewResponseStateInvalidError } from '../errors/interview-response-state-invalid.error';
import { InterviewStateInvalidError } from '../errors/interview-state-invalid.error';
import type { ApplicationInterviewRecord, ApplicationRecord } from '../ports';
import { InterviewOperations } from './interview-operations.service';

const baseApplication: ApplicationRecord = {
  candidateIdentityId: 'candidate-1',
  coverLetter: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  employerIdentityId: 'employer-1',
  id: 'application-1',
  jobId: 'job-1',
  resumeId: 'resume-1',
  status: 'shortlisted',
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const baseInterview: ApplicationInterviewRecord = {
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

function createOperations(overrides: {
  applicationRepository?: Record<string, unknown>;
  recruitmentRepository?: Record<string, unknown>;
}) {
  let idCounter = 0;
  const histories: Array<{ eventType: string; note: string | null; toStatus: string }> = [];

  const applicationRepository = {
    async createHistory(data: {
      eventType: string;
      note: string | null;
      toStatus: string;
    }) {
      histories.push({
        eventType: data.eventType,
        note: data.note,
        toStatus: data.toStatus
      });
      return data;
    },
    async findById(id: string) {
      if (id === 'application-1') {
        return { ...baseApplication, status: 'interview' as const };
      }
      return null;
    },
    async findByIdAndEmployer(applicationId: string, employerIdentityId: string) {
      if (applicationId === 'application-1' && employerIdentityId === 'employer-1') {
        return baseApplication;
      }
      return null;
    },
    async updateStatus(_applicationId: string, status: string) {
      return { ...baseApplication, status: status as ApplicationRecord['status'] };
    },
    ...overrides.applicationRepository
  };

  const recruitmentRepository = {
    async createInterview(data: Record<string, unknown>) {
      return { ...baseInterview, ...data, id: 'interview-new' } as ApplicationInterviewRecord;
    },
    async findInterviewByApplicationAndCandidate(applicationId: string, candidateIdentityId: string) {
      if (applicationId === 'application-1' && candidateIdentityId === 'candidate-1') {
        return baseInterview;
      }
      return null;
    },
    async findInterviewByIdAndCandidate(interviewId: string, candidateIdentityId: string) {
      if (interviewId === 'interview-1' && candidateIdentityId === 'candidate-1') {
        return baseInterview;
      }
      return null;
    },
    async findInterviewByIdAndEmployer(interviewId: string, employerIdentityId: string) {
      if (interviewId === 'interview-1' && employerIdentityId === 'employer-1') {
        return baseInterview;
      }
      return null;
    },
    async updateInterview(_id: string, data: Record<string, unknown>) {
      return { ...baseInterview, ...data } as ApplicationInterviewRecord;
    },
    ...overrides.recruitmentRepository
  };

  const operations = new InterviewOperations(
    applicationRepository as never,
    recruitmentRepository as never,
    {
      generate() {
        idCounter += 1;
        return `generated-${idCounter}`;
      }
    }
  );

  return { histories, operations };
}

test('create interview moves application to interview and writes history', async () => {
  const { histories, operations } = createOperations({});
  let statusUpdated = false;

  const result = await operations.createInterview('employer-1', 'application-1', {
    date: '2026-06-20',
    durationMinutes: 60,
    round: 'Technical',
    startTime: '10:00',
    type: 'online'
  });

  assert.equal(result.id, 'interview-new');
  assert.ok(histories.some((item) => item.eventType === 'status_change' && item.toStatus === 'interview'));
  assert.ok(histories.some((item) => item.eventType === 'interview_scheduled'));
});

test('create interview rejects terminal application', async () => {
  const { operations } = createOperations({
    applicationRepository: {
      async findByIdAndEmployer() {
        return { ...baseApplication, status: 'hired' as const };
      }
    }
  });

  await assert.rejects(
    () =>
      operations.createInterview('employer-1', 'application-1', {
        date: '2026-06-20',
        durationMinutes: 60,
        round: 'Technical',
        startTime: '10:00',
        type: 'online'
      }),
    InterviewApplicationStateInvalidError
  );
});

test('update interview reschedules when slot changes', async () => {
  const { histories, operations } = createOperations({});

  const result = await operations.updateInterview('employer-1', 'interview-1', {
    date: '2026-06-21',
    startTime: '14:00'
  });

  assert.equal(result.status, 'rescheduled');
  assert.ok(histories.some((item) => item.eventType === 'interview_status_changed'));
});

test('cancel interview blocks terminal interview status', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async findInterviewByIdAndEmployer() {
        return { ...baseInterview, status: 'cancelled' };
      }
    }
  });

  await assert.rejects(
    () => operations.cancelInterview('employer-1', 'interview-1', { reason: 'No longer needed' }),
    InterviewStateInvalidError
  );
});

test('candidate confirm enforces respondable status', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async findInterviewByIdAndCandidate() {
        return { ...baseInterview, status: 'confirmed' };
      }
    }
  });

  await assert.rejects(
    () => operations.confirmInterview('candidate-1', 'interview-1', {}),
    InterviewResponseStateInvalidError
  );
});

test('candidate confirm updates status and history', async () => {
  const { histories, operations } = createOperations({});

  const result = await operations.confirmInterview('candidate-1', 'interview-1', {
    candidateResponseNote: 'See you then'
  });

  assert.equal(result.status, 'confirmed');
  assert.ok(histories.some((item) => item.note?.includes('confirmed')));
});

test('get candidate interview returns not found for wrong owner', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async findInterviewByApplicationAndCandidate() {
        return null;
      }
    }
  });

  await assert.rejects(
    () => operations.getCandidateInterview('candidate-2', 'application-1'),
    InterviewNotFoundError
  );
});

test('candidate decline updates status and writes history', async () => {
  const { histories, operations } = createOperations({});

  const result = await operations.declineInterview('candidate-1', 'interview-1', {
    candidateResponseNote: 'Cannot attend'
  });

  assert.equal(result.status, 'cancelled');
  assert.ok(histories.some((item) => item.note?.includes('declined')));
});

test('candidate request reschedule stores proposed slot and writes history', async () => {
  const { histories, operations } = createOperations({});

  const result = await operations.requestReschedule('candidate-1', 'interview-1', {
    proposedDate: '2026-06-22',
    proposedDurationMinutes: 45,
    proposedStartTime: '15:00',
    proposedTimezone: 'Asia/Ho_Chi_Minh'
  });

  assert.equal(result.status, 'rescheduled');
  assert.equal(result.candidateProposedDate, '2026-06-22');
  assert.ok(histories.some((item) => item.note?.includes('reschedule')));
});

test('list employer interviews returns repository rows', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async listEmployerInterviews(employerIdentityId: string) {
        assert.equal(employerIdentityId, 'employer-1');
        return [baseInterview];
      }
    }
  });

  const result = await operations.listEmployerInterviews('employer-1');

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'interview-1');
});
