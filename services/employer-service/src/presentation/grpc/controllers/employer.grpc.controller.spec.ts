import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerProfileAlreadyExistsError } from '../../../application/errors/employer-profile-already-exists.error';
import { CreateEmployerProfileUseCase } from '../../../application/profiles/use-cases/create-employer-profile.use-case';
import { EmployerGrpcController } from './employer.grpc.controller';

test('maps create-employer-profile request and response', async () => {
  const useCase = {
    execute: async () => ({
      identityId: 'identity-1',
      profileId: 'employer-profile-1'
    })
  } as unknown as CreateEmployerProfileUseCase;
  const controller = new EmployerGrpcController(useCase);

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
  } as unknown as CreateEmployerProfileUseCase;
  const controller = new EmployerGrpcController(useCase);

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
