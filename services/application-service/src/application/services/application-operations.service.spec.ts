import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidApplicationStatusTransitionError } from '../errors/invalid-application-status-transition.error';
import { ApplicationNotificationEventFactory } from '../notifications/application-notification-event.factory';
import type {
  ApplicationRecord,
  ApplicationRepository,
  CreateApplicationData,
  CreateApplicationHistoryData,
  TransitionApplicationStatusWithHistoryData
} from '../ports';
import { ApplicationOperations } from './application-operations.service';

function makeApplication(
  status: ApplicationRecord['status'] = 'applied'
): ApplicationRecord {
  return {
    candidateIdentityId: 'candidate-1',
    coverLetter: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    employerIdentityId: 'employer-1',
    id: 'application-1',
    jobId: 'job-1',
    resumeId: 'resume-1',
    status,
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  };
}

function makeIdGenerator() {
  let count = 0;
  return {
    generate() {
      count += 1;
      return count === 1 ? 'application-1' : `history-${count - 1}`;
    }
  };
}

function makeOperations(
  applicationRepository: Partial<ApplicationRepository>,
  options?: {
    outboxCreates?: unknown[];
    transitionCalls?: TransitionApplicationStatusWithHistoryData[];
  }
) {
  const createCalls: Array<{
    application: CreateApplicationData;
    history: CreateApplicationHistoryData;
  }> = [];
  const outboxCreates = options?.outboxCreates ?? [];
  const transitionCalls = options?.transitionCalls ?? [];

  const contextRepository = {
    async create(application: CreateApplicationData) {
      createCalls.push({
        application,
        history: {
          actorIdentityId: '',
          actorType: 'candidate',
          applicationId: application.id,
          eventType: 'status_change',
          fromStatus: null,
          id: 'history-placeholder',
          note: '',
          toStatus: application.status
        }
      });
      return makeApplication(application.status);
    },
    async createHistory(history: CreateApplicationHistoryData) {
      const last = createCalls[createCalls.length - 1];
      if (last) {
        last.history = history;
      }
    },
    async transitionStatusWithHistory(data: TransitionApplicationStatusWithHistoryData) {
      transitionCalls.push(data);
      return applicationRepository.transitionStatusWithHistory
        ? applicationRepository.transitionStatusWithHistory(data)
        : makeApplication(data.status);
    }
  };

  return {
    createCalls,
    operations: new ApplicationOperations(
      applicationRepository as ApplicationRepository,
      {
        async execute(work) {
          return work({
          applicationRepository: contextRepository as never,
          outboxRepository: {
            async create(record: unknown) {
              outboxCreates.push(record);
            },
            async deleteFailedBatch() {
              return 0;
            }
          } as never,
          recruitmentRepository: {} as never
        });
        }
      },
      new ApplicationNotificationEventFactory({
        createSourceEventId: () => 'source-event-1'
      }),
      makeIdGenerator()
    ),
    outboxCreates,
    transitionCalls
  };
}

test('application operations applies with application, history, and outbox in one transaction', async () => {
  const outboxCreates: unknown[] = [];
  const { createCalls, operations } = makeOperations(
    {
      async findByJobAndCandidate() {
        return null;
      }
    },
    { outboxCreates }
  );

  const result = await operations.applyToJob({
    candidateIdentityId: ' candidate-1 ',
    coverLetter: ' Cover letter ',
    employerIdentityId: ' employer-1 ',
    jobId: ' job-1 ',
    resumeId: ' resume-1 '
  });

  assert.equal(result.status, 'applied');
  const createData = createCalls[0];
  assert.equal(createData?.application.id, 'application-1');
  assert.equal(createData?.application.coverLetter, 'Cover letter');
  assert.equal(createData?.history.eventType, 'status_change');
  assert.equal(createData?.history.toStatus, 'applied');
  assert.equal(outboxCreates.length, 2);
  assert.equal((outboxCreates[0] as { eventName: string }).eventName, 'notifications.application-received.v1');
  assert.equal((outboxCreates[1] as { eventName: string }).eventName, 'application.created.v1');
});

test('application operations updates employer status with atomic history and outbox', async () => {
  const transitionCalls: TransitionApplicationStatusWithHistoryData[] = [];
  const outboxCreates: unknown[] = [];
  const { operations } = makeOperations(
    {
      async findById() {
        return makeApplication('applied');
      },
      async transitionStatusWithHistory(data: TransitionApplicationStatusWithHistoryData) {
        transitionCalls.push(data);
        return makeApplication('reviewed');
      }
    },
    { outboxCreates, transitionCalls }
  );

  const result = await operations.updateEmployerStatus({
    applicationId: 'application-1',
    employerIdentityId: 'employer-1',
    status: 'reviewed'
  });

  assert.equal(result.status, 'reviewed');
  const transitionData = transitionCalls[0];
  assert.equal(transitionData?.expectedStatus, 'applied');
  assert.equal(transitionData?.status, 'reviewed');
  assert.equal(
    transitionData?.history.note,
    'Employer moved application from applied to reviewed.'
  );
  assert.equal(outboxCreates.length, 2);
  assert.equal((outboxCreates[0] as { eventName: string }).eventName, 'notifications.application-status-changed.v1');
  assert.equal((outboxCreates[1] as { eventName: string }).eventName, 'application.status-updated.v1');
});

test('application operations rejects invalid employer lifecycle jump', async () => {
  const { operations } = makeOperations({
    async findById() {
      return makeApplication('applied');
    }
  });

  await assert.rejects(
    () =>
      operations.updateEmployerStatus({
        applicationId: 'application-1',
        employerIdentityId: 'employer-1',
        status: 'hired'
      }),
    InvalidApplicationStatusTransitionError
  );
});

test('application operations withdraws with atomic history', async () => {
  const transitionCalls: TransitionApplicationStatusWithHistoryData[] = [];
  const operations = new ApplicationOperations(
    {
      async findById() {
        return makeApplication('shortlisted');
      },
      async transitionStatusWithHistory(data: TransitionApplicationStatusWithHistoryData) {
        transitionCalls.push(data);
        return makeApplication('withdrawn');
      }
    } as never,
    {
      async execute<T>(work: () => Promise<T>) {
        return work();
      }
    } as never,
    new ApplicationNotificationEventFactory({
      createSourceEventId: () => 'source-event-1'
    }),
    makeIdGenerator()
  );

  const result = await operations.withdrawApplication({
    applicationId: 'application-1',
    candidateIdentityId: 'candidate-1'
  });

  assert.equal(result.status, 'withdrawn');
  const transitionData = transitionCalls[0];
  assert.equal(transitionData?.expectedStatus, 'shortlisted');
  assert.equal(transitionData?.status, 'withdrawn');
  assert.equal(transitionData?.history.note, 'Candidate withdrew the application.');
});
