import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { RegisterIdentityCommandHandler } from './application';
import { IAM_PRISMA_TOKENS } from './infrastructure';
import { IamModule } from './iam.module';

test('compiles the iam module and resolves RegisterIdentityCommandHandler', async () => {
  process.env.DATABASE_URL =
    'postgresql://careerhub:test@localhost:5432/iam_service';
  process.env.SERVICE_NAME = 'iam-service';

  const identitiesByEmail = new Map<
    string,
    {
      acceptedTerms: boolean;
      createdAt: Date;
      email: string;
      id: string;
      passwordHash: string;
      role: 'candidate' | 'employer';
      status: 'active' | 'disabled' | 'pending_profile';
      updatedAt: Date;
    }
  >();
  const outboxRecords: Array<{ eventName: string; id: string }> = [];
  const prismaClient = {
    outbox: {
      count: async () => 0,
      create: async ({
        data
      }: {
        data: { eventName: string; id: string };
      }) => {
        outboxRecords.push(data);
        return {
          ...data,
          lastError: null,
          nextRetryAt: null,
          occurredAt: new Date(),
          payload: {},
          processingAt: null,
          processedAt: null,
          retryCount: 0,
          status: 'pending' as const
        };
      },
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
        status: 'processed' as const
      }),
      updateMany: async () => ({ count: 0 })
    },
    identity: {
      create: async ({
        data
      }: {
        data: {
          acceptedTerms: boolean;
          createdAt: Date;
          email: string;
          id: string;
          passwordHash: string;
          role: 'candidate' | 'employer';
          status: 'active' | 'disabled' | 'pending_profile';
          updatedAt: Date;
        };
      }) => {
        identitiesByEmail.set(data.email, data);
        return data;
      },
      findUnique: async ({
        where
      }: {
        select?: { id?: boolean };
        where: { email: string };
      }) => {
        const identity = identitiesByEmail.get(where.email);
        return identity ?? null;
      },
      update: async () => {
        throw new Error('Not implemented in this test');
      }
    },
    authSession: {
      create: async () => {
        throw new Error('Not implemented in this test');
      },
      findUnique: async () => null,
      update: async () => {
        throw new Error('Not implemented in this test');
      },
      updateMany: async () => ({ count: 0 })
    },
    passwordResetToken: {
      create: async () => {
        throw new Error('Not implemented in this test');
      },
      findUnique: async () => null,
      update: async () => {
        throw new Error('Not implemented in this test');
      },
      updateMany: async () => ({ count: 0 })
    }
  };

  const fakePrismaService = {
    async ping(): Promise<{ database: 'up' }> {
      return { database: 'up' };
    },
    async transaction<T>(
      work: (client: typeof prismaClient) => Promise<T>
    ): Promise<T> {
      return work(prismaClient);
    },
    prisma: prismaClient
  };

  const moduleBuilder = Test.createTestingModule({
    imports: [IamModule]
  });

  moduleBuilder
    .overrideProvider(IAM_PRISMA_TOKENS.service)
    .useValue(fakePrismaService);

  const moduleRef = await moduleBuilder.compile();

  const useCase = moduleRef.get(RegisterIdentityCommandHandler);
  const result = await useCase.execute({
    acceptedTerms: true,
    email: 'user@example.com',
    password: 'plain-password',
    role: 'candidate'
  });

  assert.ok(useCase instanceof RegisterIdentityCommandHandler);
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.role, 'candidate');
  assert.equal(result.status, 'pending_profile');
  assert.match(
    identitiesByEmail.get('user@example.com')?.passwordHash ?? '',
    /^\$argon2id\$/
  );
  assert.equal(outboxRecords.length, 1);
  assert.equal(outboxRecords[0]?.eventName, 'iam.user.registered.v1');

  await moduleRef.close();
});
