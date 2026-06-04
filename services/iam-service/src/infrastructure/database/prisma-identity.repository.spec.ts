import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { Email, Identity, PasswordHash, Role } from '../../domain';
import { IamPrismaService } from './iam-prisma.service';
import type {
  IdentityPersistenceRecord,
  IamPrismaClient
} from './iam-prisma.types';
import { PrismaIdentityRepository } from './prisma-identity.repository';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

class FakeIamPrismaClient implements IamPrismaClient {
  readonly createdRecords: IdentityPersistenceRecord[] = [];
  readonly identitiesByEmail = new Map<string, IdentityPersistenceRecord>();

  identity = {
    create: async ({
      data
    }: {
      data: IdentityPersistenceRecord;
    }): Promise<IdentityPersistenceRecord> => {
      this.createdRecords.push(data);
      this.identitiesByEmail.set(data.email, data);
      return data;
    },
    findUnique: async ({
      where
    }: {
      select?: { id?: boolean };
      where: { email: string };
    }): Promise<Pick<IdentityPersistenceRecord, 'id'> | null> => {
      const record = this.identitiesByEmail.get(where.email);
      return record ? { id: record.id } : null;
    }
  };

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
}

test('returns false before save and true after save for normalized email', async () => {
  const prismaClient = new FakeIamPrismaClient();
  const repository = new PrismaIdentityRepository(
    new IamPrismaService(prismaClient)
  );

  const email = new Email('User@Example.com');
  assert.equal(await repository.existsByEmail(email), false);

  const identity = Identity.register({
    acceptedTerms: true,
    email,
    id: new UniqueEntityID('identity-1'),
    passwordHash: new PasswordHash(ARGON2ID_HASH),
    role: new Role('candidate')
  });

  await repository.save(identity);

  assert.equal(
    await repository.existsByEmail(new Email('user@example.com')),
    true
  );
  assert.equal(prismaClient.createdRecords[0]?.email, 'user@example.com');
  assert.equal(prismaClient.createdRecords[0]?.role, 'candidate');
  assert.equal(prismaClient.createdRecords[0]?.status, 'active');
  assert.equal(prismaClient.createdRecords[0]?.acceptedTerms, true);
});
