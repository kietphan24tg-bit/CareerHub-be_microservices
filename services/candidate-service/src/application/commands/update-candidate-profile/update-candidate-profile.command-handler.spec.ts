import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboxRecord } from '@careerhub/contracts';
import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import type { CandidateWriteTransaction, IdGenerator } from '../../ports';
import { UpdateCandidateProfileCommandHandler } from './update-candidate-profile.command-handler';

class FakeIdGenerator implements IdGenerator {
  constructor(private readonly value: string) {}

  generate(): string {
    return this.value;
  }
}

class FakeCandidateWriteTransaction implements CandidateWriteTransaction {
  outboxRecords: OutboxRecord[] = [];

  constructor(
    private readonly updateByIdentityId: (
      identityId: string,
      patch: Record<string, unknown>
    ) => Promise<Record<string, unknown> | null>
  ) {}

  async execute<T>(
    work: Parameters<CandidateWriteTransaction['execute']>[0]
  ): Promise<T> {
    return (await work({
      candidateProfileRepository: {
        async existsByIdentityId() {
          return true;
        },
        async findByIdentityId() {
          return null;
        },
        async save() {},
        async deleteByIdentityId() {
          return false;
        },
        updateByIdentityId: this.updateByIdentityId as never
      },
      outboxRepository: {
        claimPending: async () => null,
        create: async (record) => {
          this.outboxRecords.push(record);
        },
        deleteProcessedBatch: async () => 0,
        findPendingBatch: async () => [],
        markFailed: async () => {},
        markProcessed: async () => {},
        requeueRetryableFailed: async () => 0,
        requeueStaleProcessing: async () => 0,
        summarizeBacklog: async () => ({
          failed: 0,
          pending: 0,
          processing: 0
        })
      }
    })) as T;
  }
}

test('updates candidate profile successfully and writes outbox record', async () => {
  const writeTransaction = new FakeCandidateWriteTransaction(
    async (identityId, patch) => ({
      address: (patch.address as string | null | undefined) ?? null,
      avatarUrl: (patch.avatarUrl as string | null | undefined) ?? null,
      bio: (patch.bio as string | null | undefined) ?? null,
      createdAt: new Date('2026-06-06T00:00:00.000Z'),
      fullName: (patch.fullName as string | undefined) ?? 'Candidate',
      githubUrl: (patch.githubUrl as string | null | undefined) ?? null,
      headline: (patch.headline as string | null | undefined) ?? null,
      id: 'candidate-profile-1',
      identityId,
      linkedinUrl: (patch.linkedinUrl as string | null | undefined) ?? null,
      phone: (patch.phone as string | null | undefined) ?? null,
      portfolioUrl: (patch.portfolioUrl as string | null | undefined) ?? null,
      updatedAt: new Date('2026-06-06T01:00:00.000Z'),
      yearsExperience: (patch.yearsExperience as number | null | undefined) ?? null
    })
  );
  const handler = new UpdateCandidateProfileCommandHandler(
    writeTransaction,
    new FakeIdGenerator('candidate-outbox-1')
  );

  const result = await handler.execute({
    fullName: 'Updated Candidate',
    githubUrl: 'https://github.com/candidate',
    identityId: 'identity-1',
    requestId: 'req-candidate-1',
    yearsExperience: 3
  });

  assert.equal(result.fullName, 'Updated Candidate');
  assert.equal(result.githubUrl, 'https://github.com/candidate');
  assert.equal(result.yearsExperience, 3);
  assert.equal(writeTransaction.outboxRecords.length, 1);
  assert.equal(
    writeTransaction.outboxRecords[0]?.eventName,
    'candidate.profile.updated.v1'
  );
});

test('throws when updated candidate profile does not exist', async () => {
  const writeTransaction = new FakeCandidateWriteTransaction(async () => null);
  const handler = new UpdateCandidateProfileCommandHandler(
    writeTransaction,
    new FakeIdGenerator('candidate-outbox-2')
  );

  await assert.rejects(
    () =>
      handler.execute({
        headline: 'Updated',
        identityId: 'identity-missing'
      }),
    CandidateProfileNotFoundError
  );

  assert.equal(writeTransaction.outboxRecords.length, 0);
});

test('throws when candidate update payload is empty', async () => {
  const writeTransaction = new FakeCandidateWriteTransaction(async () => null);
  const handler = new UpdateCandidateProfileCommandHandler(
    writeTransaction,
    new FakeIdGenerator('candidate-outbox-3')
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1'
      }),
    ValidationError
  );

  assert.equal(writeTransaction.outboxRecords.length, 0);
});
