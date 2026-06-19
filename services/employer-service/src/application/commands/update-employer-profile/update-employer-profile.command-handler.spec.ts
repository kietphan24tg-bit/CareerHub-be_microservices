import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { EmployerProfileNotFoundError } from '../../errors/employer-profile-not-found.error';
import { UpdateEmployerProfileCommandHandler } from './update-employer-profile.command-handler';

test('updates employer profile successfully', async () => {
  let receivedPatch: Record<string, unknown> | null = null;
  const handler = new UpdateEmployerProfileCommandHandler({
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return {
        address: '123 Street',
        companyName: 'CareerHub',
        companySize: null,
        contactName: 'Employer User',
        contactPhone: '0987654321',
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        description: null,
        foundedYear: null,
        id: 'employer-profile-1',
        identityId: 'identity-1',
        industry: 'technology',
        logoUrl: null,
        taxCode: null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
        website: null
      };
    },
    async save() {},
    async deleteByIdentityId() {
      return false;
    },
    async updateByIdentityId(identityId, patch) {
      receivedPatch = patch;
      return {
        address: patch.address ?? null,
        companyName: patch.companyName ?? 'CareerHub',
        companySize: patch.companySize ?? null,
        contactName: patch.contactName ?? null,
        contactPhone: patch.contactPhone ?? null,
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        description: patch.description ?? null,
        foundedYear: patch.foundedYear ?? null,
        id: 'employer-profile-1',
        identityId,
        industry: patch.industry ?? null,
        logoUrl: patch.logoUrl ?? null,
        taxCode: patch.taxCode ?? null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
        website: patch.website ?? null
      };
    }
  });

  const result = await handler.execute({
    companyName: 'Updated Company',
    identityId: 'identity-1',
    website: 'https://careerhub.dev'
  });

  assert.equal(result.companyName, 'Updated Company');
  assert.equal(result.website, 'https://careerhub.dev');
  assert.deepEqual(receivedPatch, {
    companyName: 'Updated Company',
    website: 'https://careerhub.dev'
  });
});

test('throws when updated employer profile does not exist', async () => {
  const handler = new UpdateEmployerProfileCommandHandler({
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
        description: 'Updated description',
        identityId: 'identity-missing'
      }),
    EmployerProfileNotFoundError
  );
});

test('throws when employer update payload is empty', async () => {
  const handler = new UpdateEmployerProfileCommandHandler({
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return {
        address: '123 Street',
        companyName: 'CareerHub',
        companySize: null,
        contactName: 'Employer User',
        contactPhone: '0987654321',
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        description: null,
        foundedYear: null,
        id: 'employer-profile-1',
        identityId: 'identity-1',
        industry: 'technology',
        logoUrl: null,
        taxCode: null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
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

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1'
      }),
    ValidationError
  );
});
