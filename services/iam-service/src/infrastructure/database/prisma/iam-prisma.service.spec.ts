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
    }
  };

  identity = {
    create: async () => {
      throw new Error('Not implemented in this test');
    },
    findUnique: async () => null,
    update: async () => {
      throw new Error('Not implemented in this test');
    }
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
