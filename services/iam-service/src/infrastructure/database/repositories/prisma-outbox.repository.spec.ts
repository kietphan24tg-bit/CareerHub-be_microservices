import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaOutboxRepository } from './prisma-outbox.repository';
import type {
  IamPrismaRepositoryClient,
  OutboxPersistenceRecord
} from '../prisma/iam-prisma.types';

const sampleRecord: OutboxPersistenceRecord = {
  eventName: 'iam.user.registered.v1',
  id: 'outbox-1',
  lastError: null,
  nextRetryAt: null,
  occurredAt: new Date('2026-06-01T00:00:00.000Z'),
  payload: {},
  processingAt: null,
  processedAt: new Date('2026-06-01T00:01:00.000Z'),
  retryCount: 0,
  status: 'processed'
};

test('deleteProcessedBatch deletes only selected processed records by id batch', async () => {
  let deletedWhere: Record<string, unknown> | undefined;

  const repository = new PrismaOutboxRepository({
    authSession: {} as never,
    identity: {} as never,
    passwordResetToken: {} as never,
    outbox: {
      count: async () => 0,
      create: async () => sampleRecord,
      deleteMany: async ({ where }) => {
        deletedWhere = where;
        return { count: 2 };
      },
      findFirst: async () => null,
      findMany: async () => [
        { ...sampleRecord, id: 'outbox-1' },
        { ...sampleRecord, id: 'outbox-2' }
      ],
      findUnique: async () => sampleRecord,
      update: async () => sampleRecord,
      updateMany: async () => ({ count: 0 })
    }
  } as IamPrismaRepositoryClient);

  const deleted = await repository.deleteProcessedBatch(
    new Date('2026-06-08T00:00:00.000Z'),
    50
  );

  assert.equal(deleted, 2);
  assert.deepEqual(deletedWhere, {
    id: {
      in: ['outbox-1', 'outbox-2']
    }
  });
});

test('summarizeBacklog returns status counts and oldest pending timestamp', async () => {
  const countQueries: Array<Record<string, unknown> | undefined> = [];

  const repository = new PrismaOutboxRepository({
    authSession: {} as never,
    identity: {} as never,
    passwordResetToken: {} as never,
    outbox: {
      count: async ({ where }) => {
        countQueries.push(where);

        if (where?.['status'] === 'pending') {
          return 4;
        }

        if (where?.['status'] === 'processing') {
          return 2;
        }

        return 1;
      },
      create: async () => sampleRecord,
      deleteMany: async () => ({ count: 0 }),
      findFirst: async () => ({
        occurredAt: new Date('2026-06-01T00:00:00.000Z')
      }),
      findMany: async () => [],
      findUnique: async () => sampleRecord,
      update: async () => sampleRecord,
      updateMany: async () => ({ count: 0 })
    }
  } as IamPrismaRepositoryClient);

  const summary = await repository.summarizeBacklog();

  assert.deepEqual(summary, {
    failed: 1,
    oldestPendingOccurredAt: new Date('2026-06-01T00:00:00.000Z'),
    pending: 4,
    processing: 2
  });
  assert.equal(countQueries.length, 3);
});
