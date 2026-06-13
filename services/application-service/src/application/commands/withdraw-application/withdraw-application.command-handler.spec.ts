import assert from 'node:assert/strict';
import test from 'node:test';
import { WithdrawApplicationCommandHandler } from './withdraw-application.command-handler';

test('withdraw application delegates to application operations', async () => {
  let received: unknown = null;
  const handler = new WithdrawApplicationCommandHandler({
    async withdrawApplication(command: unknown) {
      received = command;
      return {
        candidateIdentityId: 'candidate-1',
        coverLetter: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        employerIdentityId: 'employer-1',
        id: 'application-1',
        jobId: 'job-1',
        resumeId: 'resume-1',
        status: 'withdrawn',
        updatedAt: new Date('2026-01-02T00:00:00.000Z')
      };
    }
  } as never);

  const command = {
    applicationId: 'application-1',
    candidateIdentityId: 'candidate-1'
  };
  const result = await handler.execute(command);

  assert.equal(result.status, 'withdrawn');
  assert.equal(received, command);
});
