import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { EmployerProfileAlreadyExistsError } from '../../errors/employer-profile-already-exists.error';
import { CreateEmployerProfileUseCase } from './create-employer-profile.use-case';

test('creates an employer profile successfully', async () => {
  const savedProfiles: Array<Record<string, string>> = [];
  const useCase = new CreateEmployerProfileUseCase(
    {
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
        return 'employer-profile-1';
      }
    }
  );

  const result = await useCase.execute({
    address: '123 Street',
    companyName: 'CareerHub',
    contactName: 'Employer User',
    contactPhone: '0987654321',
    identityId: 'identity-1',
    industry: 'technology'
  });

  assert.deepEqual(result, {
    identityId: 'identity-1',
    profileId: 'employer-profile-1'
  });
  assert.equal(savedProfiles.length, 1);
});

test('fails when profile already exists for identity', async () => {
  const useCase = new CreateEmployerProfileUseCase(
    {
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
        return 'employer-profile-2';
      }
    }
  );

  await assert.rejects(
    () =>
      useCase.execute({
        address: '123 Street',
        companyName: 'CareerHub',
        contactName: 'Employer User',
        contactPhone: '0987654321',
        identityId: 'identity-1',
        industry: 'technology'
      }),
    EmployerProfileAlreadyExistsError
  );
});

test('fails when required fields are blank', async () => {
  const useCase = new CreateEmployerProfileUseCase(
    {
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
        return 'employer-profile-3';
      }
    }
  );

  await assert.rejects(
    () =>
      useCase.execute({
        address: ' ',
        companyName: '',
        contactName: ' ',
        contactPhone: '',
        identityId: '',
        industry: ' '
      }),
    ValidationError
  );
});
