import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateProfilesController } from '../candidate-profiles/candidate-profiles.controller';
import { CompanyProfilesController } from '../company-profiles/company-profiles.controller';

test('candidate profiles controller returns profile payload', async () => {
  const controller = new CandidateProfilesController({
    async getCandidateProfile() {
      return {
        address: null,
        avatarUrl: null,
        bio: null,
        createdAt: '2026-06-06T00:00:00.000Z',
        fullName: 'Candidate',
        githubUrl: null,
        headline: null,
        id: 'candidate-profile-1',
        identityId: 'identity-1',
        linkedinUrl: null,
        phone: '0123456789',
        portfolioUrl: null,
        updatedAt: '2026-06-06T01:00:00.000Z',
        yearsExperience: null
      };
    },
    async getEmployerProfile() {
      throw new Error('unused');
    },
    async updateCandidateProfile() {
      throw new Error('unused');
    },
    async updateEmployerProfile() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.getProfile(
    {
      email: 'candidate@example.com',
      id: 'identity-1',
      role: 'candidate'
    },
    'req-1'
  );

  assert.equal(response.message, 'Candidate profile loaded successfully');
  assert.equal(response.data.profile.id, 'candidate-profile-1');
});

test('company profiles controller returns profile payload', async () => {
  const controller = new CompanyProfilesController({
    async getCandidateProfile() {
      throw new Error('unused');
    },
    async getEmployerProfile() {
      return {
        address: null,
        companyName: 'CareerHub',
        companySize: null,
        contactName: null,
        contactPhone: null,
        createdAt: '2026-06-06T00:00:00.000Z',
        description: null,
        foundedYear: null,
        id: 'employer-profile-1',
        identityId: 'identity-2',
        industry: null,
        logoUrl: null,
        taxCode: null,
        updatedAt: '2026-06-06T01:00:00.000Z',
        website: null
      };
    },
    async updateCandidateProfile() {
      throw new Error('unused');
    },
    async updateEmployerProfile() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.getProfile(
    {
      email: 'employer@example.com',
      id: 'identity-2',
      role: 'employer'
    },
    'req-2'
  );

  assert.equal(response.message, 'Company profile loaded successfully');
  assert.equal(response.data.profile.id, 'employer-profile-1');
});
