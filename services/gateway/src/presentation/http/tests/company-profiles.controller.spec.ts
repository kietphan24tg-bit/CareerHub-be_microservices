import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanyProfilesController } from '../company-profiles/company-profiles.controller';

const BASE_PROFILE = {
  address: '123 Main St',
  companyName: 'Acme Corp',
  companySize: '51-200',
  contactName: 'John Doe',
  contactPhone: '+84901234567',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: 'A great company',
  foundedYear: 2010,
  id: 'employer-profile-1',
  identityId: 'employer-1',
  industry: 'Technology',
  logoUrl: null,
  taxCode: '0123456789',
  updatedAt: '2026-06-01T00:00:00.000Z',
  website: 'https://acme.com'
};

const USER = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };

test('getProfile returns employer company profile', async () => {
  const controller = new CompanyProfilesController({
    async getEmployerProfile(input: { identityId: string }) {
      assert.equal(input.identityId, 'employer-1');
      return BASE_PROFILE;
    },
    async updateEmployerProfile() {
      throw new Error('unused');
    },
    async getCandidateProfile() {
      throw new Error('unused');
    },
    async updateCandidateProfile() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.getProfile(USER, 'req-1');

  assert.equal(response.data.profile.id, 'employer-profile-1');
  assert.equal(response.data.profile.companyName, 'Acme Corp');
  assert.equal(response.message, 'Company profile loaded successfully');
});

test('updateProfile returns updated profile with new fields', async () => {
  const updatedProfile = { ...BASE_PROFILE, companyName: 'Acme Corp Updated', website: 'https://acme.io' };

  const controller = new CompanyProfilesController({
    async getEmployerProfile() {
      throw new Error('unused');
    },
    async updateEmployerProfile(input: {
      companyName?: string;
      identityId: string;
    }) {
      assert.equal(input.identityId, 'employer-1');
      assert.equal(input.companyName, 'Acme Corp Updated');
      return updatedProfile;
    },
    async getCandidateProfile() {
      throw new Error('unused');
    },
    async updateCandidateProfile() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.updateProfile(
    USER,
    { companyName: 'Acme Corp Updated', website: 'https://acme.io' } as never,
    'req-1'
  );

  assert.equal(response.data.profile.companyName, 'Acme Corp Updated');
  assert.equal(response.data.profile.website, 'https://acme.io');
  assert.equal(response.message, 'Company profile updated successfully');
});
