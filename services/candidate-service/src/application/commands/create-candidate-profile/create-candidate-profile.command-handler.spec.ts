import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileAlreadyExistsError } from '../../errors/candidate-profile-already-exists.error';
import type { CreateCandidateProfileRecord } from '../../ports';
import { CandidateProfileOperationsService } from '../../services/candidate-profile-operations.service';
import { CreateCandidateProfileCommandHandler } from './create-candidate-profile.command-handler';

const candidateProfileOperations = new CandidateProfileOperationsService();

test('creates a candidate profile successfully', async () => {
  const savedProfiles: CreateCandidateProfileRecord[] = [];
  const handler = new CreateCandidateProfileCommandHandler(
    {
      async clearResumeIdIfMatches() {},
      async deleteByIdentityId() {
        return false;
      },
      async existsByIdentityId() {
        return false;
      },
      async findByIdentityId() {
        return null;
      },
      async save(profile) {
        savedProfiles.push(profile);
      },
      async updateByIdentityId() {
        return null;
      }
    },
    {
      generate() {
        return 'candidate-profile-1';
      }
    },
    candidateProfileOperations
  );

  const result = await handler.execute({
    fullName: 'Test Candidate',
    identityId: 'identity-1',
    phone: '0123456789'
  });

  assert.deepEqual(result, {
    identityId: 'identity-1',
    profileId: 'candidate-profile-1'
  });
  assert.equal(savedProfiles.length, 1);
});

test('fails when profile already exists for identity', async () => {
  const handler = new CreateCandidateProfileCommandHandler(
    {
      async clearResumeIdIfMatches() {},
      async deleteByIdentityId() {
        return false;
      },
      async existsByIdentityId() {
        return true;
      },
      async findByIdentityId() {
        return null;
      },
      async save() {},
      async updateByIdentityId() {
        return null;
      }
    },
    {
      generate() {
        return 'candidate-profile-2';
      }
    },
    candidateProfileOperations
  );

  await assert.rejects(
    () =>
      handler.execute({
        fullName: 'Test Candidate',
        identityId: 'identity-1',
        phone: '0123456789'
      }),
    CandidateProfileAlreadyExistsError
  );
});

test('fails when required fields are blank', async () => {
  const handler = new CreateCandidateProfileCommandHandler(
    {
      async clearResumeIdIfMatches() {},
      async deleteByIdentityId() {
        return false;
      },
      async existsByIdentityId() {
        return false;
      },
      async findByIdentityId() {
        return null;
      },
      async save() {},
      async updateByIdentityId() {
        return null;
      }
    },
    {
      generate() {
        return 'candidate-profile-3';
      }
    },
    candidateProfileOperations
  );

  await assert.rejects(
    () =>
      handler.execute({
        fullName: '   ',
        identityId: '',
        phone: ' '
      }),
    ValidationError
  );
});
