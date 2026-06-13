import assert from 'node:assert/strict';
import test from 'node:test';
import { ApplyToJobCommandHandler } from './apply-to-job.command-handler';

test('apply to job delegates to application operations', async () => {
  let received: unknown = null;
  const handler = new ApplyToJobCommandHandler({
    async applyToJob(command: unknown) {
      received = command;
      return {
        candidateIdentityId: 'candidate-1',
        coverLetter: 'Cover letter',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        employerIdentityId: 'employer-1',
        id: 'application-1',
        jobId: 'job-1',
        resumeId: 'resume-1',
        status: 'applied',
        updatedAt: new Date('2026-01-01T00:00:00.000Z')
      };
    }
  } as never);

  const command = {
    candidateIdentityId: 'candidate-1',
    coverLetter: 'Cover letter',
    employerIdentityId: 'employer-1',
    jobId: 'job-1',
    resumeId: 'resume-1'
  };
  const result = await handler.execute(command);

  assert.equal(result.id, 'application-1');
  assert.equal(received, command);
});
