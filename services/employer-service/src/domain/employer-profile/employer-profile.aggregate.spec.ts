import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { EmployerProfileAggregate } from './employer-profile.aggregate';

test('create normalizes required employer profile fields', () => {
  const aggregate = EmployerProfileAggregate.create({
    address: ' 123 Street ',
    companyName: ' CareerHub ',
    contactName: ' Employer User ',
    contactPhone: ' 0987654321 ',
    id: 'employer-profile-1',
    identityId: ' identity-1 ',
    industry: ' technology '
  });

  const record = aggregate.toCreateRecord();

  assert.equal(record.id, 'employer-profile-1');
  assert.equal(record.identityId, 'identity-1');
  assert.equal(record.companyName, 'CareerHub');
  assert.equal(record.address, '123 Street');
  assert.equal(record.industry, 'technology');
});

test('update emits normalized patch for touched fields', () => {
  const aggregate = EmployerProfileAggregate.reconstitute({
    address: '123 Street',
    companyName: 'CareerHub',
    companySize: null,
    contactName: 'Employer User',
    contactPhone: '0987654321',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    description: null,
    foundedYear: null,
    id: 'employer-profile-1',
    identityId: 'identity-1',
    industry: 'technology',
    logoUrl: null,
    taxCode: null,
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    website: null
  });

  aggregate.update({
    companyName: ' Updated CareerHub ',
    taxCode: ' TAX-001 ',
    website: ' '
  });

  const patch = aggregate.toUpdatePatch(['companyName', 'taxCode', 'website']);

  assert.deepEqual(patch, {
    companyName: 'Updated CareerHub',
    taxCode: 'TAX-001',
    website: null
  });
});

test('update rejects invalid tax code characters', () => {
  const aggregate = EmployerProfileAggregate.reconstitute({
    address: '123 Street',
    companyName: 'CareerHub',
    companySize: null,
    contactName: 'Employer User',
    contactPhone: '0987654321',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    description: null,
    foundedYear: null,
    id: 'employer-profile-1',
    identityId: 'identity-1',
    industry: 'technology',
    logoUrl: null,
    taxCode: null,
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    website: null
  });

  assert.throws(
    () => aggregate.update({ taxCode: 'invalid code!' }),
    ValidationError
  );
});
