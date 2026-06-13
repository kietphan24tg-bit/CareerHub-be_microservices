import assert from 'node:assert/strict';
import test from 'node:test';
import { InvalidApplicationStatusTransitionError } from '../errors/invalid-application-status-transition.error';
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

test('application operations applies with application and history in one repository call', async () => {
  const createWithHistoryCalls: Array<{
    application: CreateApplicationData;
    history: CreateApplicationHistoryData;
  }> = [];
  const operations = new ApplicationOperations(
    {
      async createWithHistory(
        application: CreateApplicationData,
        history: CreateApplicationHistoryData
      ) {
        createWithHistoryCalls.push({ application, history });
        return makeApplication('applied');
      },
      async findByJobAndCandidate() {
        return null;
      }
    } as never,
    makeIdGenerator()
  );

  const result = await operations.applyToJob({
    candidateIdentityId: ' candidate-1 ',
    coverLetter: ' Cover letter ',
    employerIdentityId: ' employer-1 ',
    jobId: ' job-1 ',
    resumeId: ' resume-1 '
  });

  assert.equal(result.status, 'applied');
  const createWithHistoryData = createWithHistoryCalls[0];
  assert.equal(createWithHistoryData?.application.id, 'application-1');
  assert.equal(createWithHistoryData?.application.coverLetter, 'Cover letter');
  assert.equal(createWithHistoryData?.history.eventType, 'status_change');
  assert.equal(createWithHistoryData?.history.toStatus, 'applied');
});

test('application operations updates employer status with atomic history', async () => {
  const transitionCalls: TransitionApplicationStatusWithHistoryData[] = [];
  const operations = new ApplicationOperations(
    {
      async findById() {
        return makeApplication('applied');
      },
      async transitionStatusWithHistory(data: TransitionApplicationStatusWithHistoryData) {
        transitionCalls.push(data);
        return makeApplication('reviewed');
      }
    } as never,
    makeIdGenerator()
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
});

test('application operations rejects invalid employer lifecycle jump', async () => {
  const operations = new ApplicationOperations(
    {
      async findById() {
        return makeApplication('applied');
      }
    } as never,
    makeIdGenerator()
  );

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
