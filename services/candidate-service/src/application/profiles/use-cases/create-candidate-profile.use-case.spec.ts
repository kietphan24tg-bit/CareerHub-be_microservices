import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileAlreadyExistsError } from '../../errors/candidate-profile-already-exists.error';
import { CreateCandidateProfileUseCase } from './create-candidate-profile.use-case';

test('creates a candidate profile successfully', async () => {
  const savedProfiles: Array<Record<string, string>> = [];
  const useCase = new CreateCandidateProfileUseCase(
    {
      async existsByIdentityId() {
        return false;
      },
      async save(profile) {
        savedProfiles.push(profile);
      }
    },
    {
      generate() {
        return 'candidate-profile-1';
      }
    }
  );

  const result = await useCase.execute({
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
  const useCase = new CreateCandidateProfileUseCase(
    {
      async existsByIdentityId() {
        return true;
      },
      async save() {}
    },
    {
      generate() {
        return 'candidate-profile-2';
      }
    }
  );

  await assert.rejects(
    () =>
      useCase.execute({
        fullName: 'Test Candidate',
        identityId: 'identity-1',
        phone: '0123456789'
      }),
    CandidateProfileAlreadyExistsError
  );
});

test('fails when required fields are blank', async () => {
  const useCase = new CreateCandidateProfileUseCase(
    {
      async existsByIdentityId() {
        return false;
      },
      async save() {}
    },
    {
      generate() {
        return 'candidate-profile-3';
      }
    }
  );

  await assert.rejects(
    () =>
      useCase.execute({
        fullName: '   ',
        identityId: '',
        phone: ' '
      }),
    ValidationError
  );
});
