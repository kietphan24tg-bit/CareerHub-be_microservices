import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboxRecord } from '@careerhub/contracts';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import {
  Email,
  Identity,
  IdentityStatus,
  PasswordHash,
  Role
} from '../../../domain';
import { IdentityNotFoundError } from '../../errors';
import type { IamWriteTransaction } from '../../ports';
import { ActivateIdentityCommandHandler } from '../../commands/activate-identity/activate-identity.command-handler';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';

function createPendingIdentity(): Identity {
  return Identity.reconstitute({
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: new UniqueEntityID('identity-activate-1'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.pendingProfile()
    },
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
}

test('activates a pending identity and persists it', async () => {
  const identity = createPendingIdentity();
  const savedStatuses: string[] = [];
  const outboxEvents: OutboxRecord[] = [];
  const writeTransaction: IamWriteTransaction = {
    async execute(work) {
      return work({
        authSessionRepository: {} as never,
        identityRepository: {
          async deleteById() {},
          async existsByEmail() {
            return true;
          },
          async findByEmail() {
            return identity;
          },
          async findById() {
            return identity;
          },
          async save() {},
          async update(nextIdentity: Identity) {
            savedStatuses.push(nextIdentity.status.value);
          }
        },
        outboxRepository: {
          async claimPending() {
            return null;
          },
          async create(record: OutboxRecord) {
            outboxEvents.push(record);
          },
          async deleteProcessedBatch() {
            return 0;
          },
          async findPendingBatch() {
            return [];
          },
          async markFailed() {},
          async markProcessed() {},
          async requeueRetryableFailed() {
            return 0;
          },
          async requeueStaleProcessing() {
            return 0;
          },
          async summarizeBacklog() {
            return { failed: 0, pending: 0, processing: 0 };
          }
        },
        passwordResetTokenRepository: {} as never
      });
    }
  };
  const useCase = new ActivateIdentityCommandHandler(writeTransaction, {
    generate() {
      return 'outbox-activate-1';
    }
  });

  const result = await useCase.execute({
    identityId: 'identity-activate-1'
  });

  assert.equal(result.status, 'active');
  assert.deepEqual(savedStatuses, ['active']);
  assert.equal(outboxEvents.length, 1);
  assert.equal(outboxEvents[0]?.eventName, 'iam.user.registered.v1');
});

test('fails when identity does not exist', async () => {
  const writeTransaction: IamWriteTransaction = {
    async execute(work) {
      return work({
        authSessionRepository: {} as never,
        identityRepository: {
          async deleteById() {},
          async existsByEmail() {
            return false;
          },
          async findByEmail() {
            return null;
          },
          async findById() {
            return null;
          },
          async save() {},
          async update() {}
        },
        outboxRepository: {} as never,
        passwordResetTokenRepository: {} as never
      });
    }
  };
  const useCase = new ActivateIdentityCommandHandler(writeTransaction, {
    generate() {
      return 'outbox-activate-2';
    }
  });

  await assert.rejects(
    () =>
      useCase.execute({
        identityId: 'missing-identity'
      }),
    IdentityNotFoundError
  );
});
