import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { RegisterIdentityUseCase } from './application';
import { IAM_PRISMA_TOKENS } from './infrastructure';
import { IamModule } from './iam.module';

test('compiles the iam module and resolves RegisterIdentityUseCase', async () => {
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
      status: 'active' | 'disabled';
      updatedAt: Date;
    }
  >();

  const fakePrismaService = {
    async ping(): Promise<{ database: 'up' }> {
      return { database: 'up' };
    },
    prisma: {
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
            status: 'active' | 'disabled';
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
          return identity ? { id: identity.id } : null;
        }
      }
    }
  };

  const moduleBuilder = Test.createTestingModule({
    imports: [IamModule]
  });

  moduleBuilder
    .overrideProvider(IAM_PRISMA_TOKENS.service)
    .useValue(fakePrismaService);

  const moduleRef = await moduleBuilder.compile();

  const useCase = moduleRef.get(RegisterIdentityUseCase);
  const result = await useCase.execute({
    acceptedTerms: true,
    email: 'user@example.com',
    password: 'plain-password',
    role: 'candidate'
  });

  assert.ok(useCase instanceof RegisterIdentityUseCase);
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.role, 'candidate');
  assert.equal(result.status, 'active');
  assert.match(
    identitiesByEmail.get('user@example.com')?.passwordHash ?? '',
    /^\$argon2id\$/
  );

  await moduleRef.close();
});
