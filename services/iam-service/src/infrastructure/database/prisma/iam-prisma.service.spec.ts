import assert from 'node:assert/strict';
import test from 'node:test';
import { IamPrismaService } from './iam-prisma.service';
import type { IamPrismaClient } from './iam-prisma.types';

class FakeIamPrismaClient implements IamPrismaClient {
  connectCalls = 0;
  disconnectCalls = 0;
  queries: string[] = [];

  authSession = {
    create: async () => {
      throw new Error('Not implemented in this test');
    },
    findUnique: async () => null,
    update: async () => {
      throw new Error('Not implemented in this test');
    },
    updateMany: async () => ({ count: 0 })
  };

  outbox = {
    count: async () => 0,
    create: async () => ({
      eventName: 'unused',
      id: 'unused',
      lastError: null,
      nextRetryAt: null,
      occurredAt: new Date(),
      payload: {},
      processingAt: null,
      processedAt: null,
      retryCount: 0,
      status: 'pending' as const
    }),
    deleteMany: async () => ({ count: 0 }),
    findFirst: async () => null,
    findMany: async () => [],
    findUnique: async () => null,
    update: async () => ({
      eventName: 'unused',
      id: 'unused',
      lastError: null,
      nextRetryAt: null,
      occurredAt: new Date(),
      payload: {},
      processingAt: null,
      processedAt: null,
      retryCount: 0,
      status: 'pending' as const
    }),
    updateMany: async () => ({ count: 0 })
  };

  identity = {
    create: async () => {
      throw new Error('Not implemented in this test');
    },
    deleteMany: async () => ({ count: 0 }),
    findUnique: async () => null,
    update: async () => {
      throw new Error('Not implemented in this test');
    }
  };

  passwordResetToken = {
    create: async () => {
      throw new Error('Not implemented in this test');
    },
    findUnique: async () => null,
    update: async () => {
      throw new Error('Not implemented in this test');
    },
    updateMany: async () => ({ count: 0 })
  };

  async $connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async $disconnect(): Promise<void> {
    this.disconnectCalls += 1;
  }

  async $queryRawUnsafe<T = unknown>(query: string): Promise<T> {
    this.queries.push(query);
    return { database: 'up' } as T;
  }

  async $transaction<T>(
    fn: (client: IamPrismaClient) => Promise<T>
  ): Promise<T> {
    return fn(this);
  }
}

test('connects, disconnects, and pings through the shared prisma lifecycle', async () => {
  const prismaClient = new FakeIamPrismaClient();
  const service = new IamPrismaService(prismaClient);

  await service.onModuleInit();
  const readiness = await service.ping();
  await service.onApplicationShutdown();

  assert.equal(prismaClient.connectCalls, 1);
  assert.equal(prismaClient.disconnectCalls, 1);
  assert.deepEqual(readiness, { database: 'up' });
  assert.deepEqual(prismaClient.queries, ['SELECT 1']);
});
