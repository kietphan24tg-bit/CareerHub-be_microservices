import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import { GetCandidateProfileByIdentityIdQueryHandler } from './get-candidate-profile-by-identity-id.query-handler';

test('loads candidate profile by identity id', async () => {
  const handler = new GetCandidateProfileByIdentityIdQueryHandler({
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId(identityId) {
      return {
        address: 'Address',
        avatarUrl: null,
        bio: null,
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        fullName: 'Candidate',
        githubUrl: null,
        headline: null,
        id: 'candidate-profile-1',
        identityId,
        linkedinUrl: null,
        phone: '0123456789',
        portfolioUrl: null,
        updatedAt: new Date('2026-06-06T00:00:00.000Z'),
        yearsExperience: null
      };
    },
    async save() {},
    async deleteByIdentityId() {
      return false;
    },
    async updateByIdentityId() {
      return null;
    }
  });

  const result = await handler.execute({
    identityId: 'identity-1'
  });

  assert.equal(result.id, 'candidate-profile-1');
  assert.equal(result.identityId, 'identity-1');
});

test('throws when candidate profile does not exist', async () => {
  const handler = new GetCandidateProfileByIdentityIdQueryHandler({
    async existsByIdentityId() {
      return false;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async deleteByIdentityId() {
      return false;
    },
    async updateByIdentityId() {
      return null;
    }
  });

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-missing'
      }),
    CandidateProfileNotFoundError
  );
});
