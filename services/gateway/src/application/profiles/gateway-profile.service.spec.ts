import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayProfileService } from './gateway-profile.service';

test('maps candidate profile null fields from gRPC response', async () => {
  const service = new GatewayProfileService(
    {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        return {
          profile: {
            address: '',
            avatar_url: '',
            bio: '',
            created_at: '2026-06-06T00:00:00.000Z',
            full_name: 'Candidate',
            github_url: '',
            headline: '',
            id: 'candidate-profile-1',
            identity_id: 'identity-1',
            linkedin_url: '',
            null_fields: ['avatar_url', 'headline', 'years_experience'],
            phone: '0123456789',
            portfolio_url: '',
            resume_id: 'resume-1',
            updated_at: '2026-06-06T01:00:00.000Z',
            years_experience: 0
          }
        };
      },
      async updateCandidateProfile() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      },
      async updateEmployerProfile() {
        throw new Error('unused');
      }
    } as never
  );

  const profile = await service.getCandidateProfile({
    identityId: 'identity-1'
  });

  assert.equal(profile.avatarUrl, null);
  assert.equal(profile.headline, null);
  assert.equal(profile.yearsExperience, null);
  assert.equal(profile.phone, '0123456789');
  assert.equal(profile.resumeId, 'resume-1');
});

test('builds candidate profile update request with resume id fields', async () => {
  const calls: unknown[] = [];
  const service = new GatewayProfileService(
    {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      },
      async updateCandidateProfile(request: unknown) {
        calls.push(request);

        return {
          profile: {
            address: '',
            avatar_url: '',
            bio: '',
            created_at: '2026-06-06T00:00:00.000Z',
            full_name: 'Candidate',
            github_url: '',
            headline: '',
            id: 'candidate-profile-1',
            identity_id: 'identity-1',
            linkedin_url: '',
            null_fields: ['resume_id'],
            phone: '0123456789',
            portfolio_url: '',
            resume_id: '',
            updated_at: '2026-06-06T01:00:00.000Z',
            years_experience: 0
          }
        };
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      },
      async updateEmployerProfile() {
        throw new Error('unused');
      }
    } as never
  );

  const profile = await service.updateCandidateProfile({
    identityId: 'identity-1',
    resumeId: null
  });

  const request = calls[0] as {
    clear_fields: string[];
    identity_id: string;
    updated_fields: string[];
  };

  assert.deepEqual(request.clear_fields, ['resume_id']);
  assert.deepEqual(request.updated_fields, []);
  assert.equal(request.identity_id, 'identity-1');
  assert.equal(profile.resumeId, null);
});

test('builds employer profile update request with updated and clear fields', async () => {
  const calls: unknown[] = [];
  const service = new GatewayProfileService(
    {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      },
      async updateCandidateProfile() {
        throw new Error('unused');
      }
    } as never,
    {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      },
      async updateEmployerProfile(request: unknown) {
        calls.push(request);

        return {
          profile: {
            address: '',
            company_name: 'CareerHub',
            company_size: '',
            contact_name: '',
            contact_phone: '',
            created_at: '2026-06-06T00:00:00.000Z',
            description: '',
            founded_year: 2020,
            id: 'employer-profile-1',
            identity_id: 'identity-1',
            industry: '',
            logo_url: '',
            null_fields: ['industry'],
            tax_code: '',
            updated_at: '2026-06-06T01:00:00.000Z',
            website: 'https://careerhub.dev'
          }
        };
      }
    } as never
  );

  const profile = await service.updateEmployerProfile({
    identityId: 'identity-1',
    industry: null,
    website: 'https://careerhub.dev'
  });

  const request = calls[0] as {
    clear_fields: string[];
    updated_fields: string[];
    website?: string;
  };

  assert.deepEqual(request.clear_fields, ['industry']);
  assert.deepEqual(request.updated_fields, ['website']);
  assert.equal(request.website, 'https://careerhub.dev');
  assert.equal(profile.industry, null);
  assert.equal(profile.website, 'https://careerhub.dev');
});
