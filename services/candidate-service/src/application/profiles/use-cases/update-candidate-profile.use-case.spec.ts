import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import { UpdateCandidateProfileUseCase } from './update-candidate-profile.use-case';

test('updates candidate profile successfully', async () => {
  const useCase = new UpdateCandidateProfileUseCase({
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async updateByIdentityId(identityId, patch) {
      return {
        address: patch.address ?? null,
        avatarUrl: patch.avatarUrl ?? null,
        bio: patch.bio ?? null,
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        fullName: patch.fullName ?? 'Candidate',
        githubUrl: patch.githubUrl ?? null,
        headline: patch.headline ?? null,
        id: 'candidate-profile-1',
        identityId,
        linkedinUrl: patch.linkedinUrl ?? null,
        phone: patch.phone ?? null,
        portfolioUrl: patch.portfolioUrl ?? null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
        yearsExperience: patch.yearsExperience ?? null
      };
    }
  });

  const result = await useCase.execute({
    fullName: 'Updated Candidate',
    githubUrl: 'https://github.com/candidate',
    identityId: 'identity-1',
    yearsExperience: 3
  });

  assert.equal(result.fullName, 'Updated Candidate');
  assert.equal(result.githubUrl, 'https://github.com/candidate');
  assert.equal(result.yearsExperience, 3);
});

test('throws when updated candidate profile does not exist', async () => {
  const useCase = new UpdateCandidateProfileUseCase({
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
  });

  await assert.rejects(
    () =>
      useCase.execute({
        headline: 'Updated',
        identityId: 'identity-missing'
      }),
    CandidateProfileNotFoundError
  );
});

test('throws when candidate update payload is empty', async () => {
  const useCase = new UpdateCandidateProfileUseCase({
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
  });

  await assert.rejects(
    () =>
      useCase.execute({
        identityId: 'identity-1'
      }),
    ValidationError
  );
});
