import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';
import { GetEmployerProfileByIdentityIdQueryHandler } from './get-employer-profile-by-identity-id.query-handler';

test('loads employer profile by identity id', async () => {
  const handler = new GetEmployerProfileByIdentityIdQueryHandler({
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId(identityId) {
      return {
        address: 'Address',
        companyName: 'CareerHub',
        companySize: null,
        contactName: 'Employer',
        contactPhone: '0123456789',
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        description: null,
        foundedYear: null,
        id: 'employer-profile-1',
        identityId,
        industry: 'Technology',
        logoUrl: null,
        taxCode: null,
        updatedAt: new Date('2026-06-06T00:00:00.000Z'),
        website: null
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

  assert.equal(result.id, 'employer-profile-1');
  assert.equal(result.identityId, 'identity-1');
});

test('throws when employer profile does not exist', async () => {
  const handler = new GetEmployerProfileByIdentityIdQueryHandler({
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
    EmployerProfileNotFoundError
  );
});
