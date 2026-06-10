import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerProfileAlreadyExistsError } from '../../../application/errors/employer-profile-already-exists.error';
import { EmployerProfileNotFoundError } from '../../../application/errors/employer-profile-not-found.error';
import { CreateEmployerProfileCommandHandler } from '../../../application/commands/create-employer-profile/create-employer-profile.command-handler';
import { GetEmployerProfileByIdentityIdQueryHandler } from '../../../application/queries/get-employer-profile-by-identity-id/get-employer-profile-by-identity-id.query-handler';
import { UpdateEmployerProfileCommandHandler } from '../../../application/commands/update-employer-profile/update-employer-profile.command-handler';
import { EmployerGrpcController } from './employer.grpc.controller';

test('maps create-employer-profile request and response', async () => {
  const useCase = {
    execute: async () => ({
      identityId: 'identity-1',
      profileId: 'employer-profile-1'
    })
  } as unknown as CreateEmployerProfileCommandHandler;
  const controller = new EmployerGrpcController(
    useCase,
    { execute: async () => ({ compensated: true }) } as never,
    { execute: async () => { throw new Error('unused'); } } as unknown as GetEmployerProfileByIdentityIdQueryHandler,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateEmployerProfileCommandHandler
  );

  const response = await controller.createEmployerProfile({
    address: 'Address',
    company_name: 'CareerHub',
    contact_name: 'Employer Name',
    contact_phone: '0123456789',
    identity_id: 'identity-1',
    industry: 'Technology',
    request_id: 'req-1'
  });

  assert.deepEqual(response, {
    identity_id: 'identity-1',
    profile_id: 'employer-profile-1'
  });
});

test('converts conflict errors into ALREADY_EXISTS gRPC payloads', async () => {
  const useCase = {
    execute: async () => {
      throw new EmployerProfileAlreadyExistsError('identity-1');
    }
  } as unknown as CreateEmployerProfileCommandHandler;
  const controller = new EmployerGrpcController(
    useCase,
    { execute: async () => ({ compensated: true }) } as never,
    { execute: async () => { throw new Error('unused'); } } as unknown as GetEmployerProfileByIdentityIdQueryHandler,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateEmployerProfileCommandHandler
  );

  await assert.rejects(
    async () =>
      controller.createEmployerProfile({
        address: 'Address',
        company_name: 'CareerHub',
        contact_name: 'Employer Name',
        contact_phone: '0123456789',
        identity_id: 'identity-1',
        industry: 'Technology',
        request_id: 'req-1'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
        message?: string;
      };

      return (
        payload.code === 'CONFLICT' &&
        payload.message ===
          'Employer profile already exists for identity: identity-1'
      );
    }
  );
});

test('maps get-employer-profile request and response', async () => {
  const controller = new EmployerGrpcController(
    { execute: async () => ({ identityId: 'identity-1', profileId: 'employer-profile-1' }) } as unknown as CreateEmployerProfileCommandHandler,
    { execute: async () => ({ compensated: true }) } as never,
    {
      execute: async () => ({
        address: 'Address',
        companyName: 'CareerHub',
        companySize: null,
        contactName: 'Employer',
        contactPhone: '0123456789',
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        description: null,
        foundedYear: 2020,
        id: 'employer-profile-1',
        identityId: 'identity-1',
        industry: 'Technology',
        logoUrl: null,
        taxCode: null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
        website: 'https://careerhub.dev'
      })
    } as unknown as GetEmployerProfileByIdentityIdQueryHandler,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateEmployerProfileCommandHandler
  );

  const response = await controller.getEmployerProfileByIdentityId({
    identity_id: 'identity-1',
    request_id: 'req-1'
  });

  assert.equal(response.profile.id, 'employer-profile-1');
  assert.equal(response.profile.company_name, 'CareerHub');
  assert.equal(response.profile.founded_year, 2020);
});

test('converts not found employer profile errors into NOT_FOUND gRPC payloads', async () => {
  const controller = new EmployerGrpcController(
    { execute: async () => ({ identityId: 'identity-1', profileId: 'employer-profile-1' }) } as unknown as CreateEmployerProfileCommandHandler,
    { execute: async () => ({ compensated: true }) } as never,
    {
      execute: async () => {
        throw new EmployerProfileNotFoundError('identity-404');
      }
    } as unknown as GetEmployerProfileByIdentityIdQueryHandler,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateEmployerProfileCommandHandler
  );

  await assert.rejects(
    async () =>
      controller.getEmployerProfileByIdentityId({
        identity_id: 'identity-404',
        request_id: 'req-1'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
      };

      return payload.code === 'NOT_FOUND';
    }
  );
});
