import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { Email, Identity, PasswordHash, Role } from '../../../domain';
import { IamPrismaService } from '../prisma/iam-prisma.service';
import type {
  IdentityPersistenceRecord,
  IamPrismaClient
} from '../prisma/iam-prisma.types';
import { PrismaIdentityRepository } from './prisma-identity.repository';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

class FakeIamPrismaClient implements IamPrismaClient {
  readonly createdRecords: IdentityPersistenceRecord[] = [];
  readonly identitiesByEmail = new Map<string, IdentityPersistenceRecord>();

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
      where: { email?: string; id?: string };
    }): Promise<IdentityPersistenceRecord | null> => {
      if (where.email) {
        return this.identitiesByEmail.get(where.email) ?? null;
      }

      if (where.id) {
        return (
          Array.from(this.identitiesByEmail.values()).find(
            (record) => record.id === where.id
          ) ?? null
        );
      }

      return null;
    },
    update: async ({
      where,
      data
    }: {
      where: { id: string };
      data: Partial<IdentityPersistenceRecord>;
    }): Promise<IdentityPersistenceRecord> => {
      const existingRecord = Array.from(this.identitiesByEmail.values()).find(
        (record) => record.id === where.id
      );

      if (!existingRecord) {
        throw new Error(`Identity not found: ${where.id}`);
      }

      const nextRecord = {
        ...existingRecord,
        ...data
      } as IdentityPersistenceRecord;

      this.identitiesByEmail.set(nextRecord.email, nextRecord);
      return nextRecord;
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
  assert.equal(prismaClient.createdRecords[0]?.status, 'pending_profile');
  assert.equal(prismaClient.createdRecords[0]?.acceptedTerms, true);
});
