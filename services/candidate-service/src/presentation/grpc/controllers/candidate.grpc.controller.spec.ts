import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateProfileAlreadyExistsError } from '../../../application/errors/candidate-profile-already-exists.error';
import { CreateCandidateProfileUseCase } from '../../../application/profiles/use-cases/create-candidate-profile.use-case';
import { CandidateGrpcController } from './candidate.grpc.controller';

test('maps create-candidate-profile request and response', async () => {
  const useCase = {
    execute: async () => ({
      identityId: 'identity-1',
      profileId: 'candidate-profile-1'
    })
  } as unknown as CreateCandidateProfileUseCase;
  const controller = new CandidateGrpcController(useCase);

  const response = await controller.createCandidateProfile({
    full_name: 'Candidate Name',
    identity_id: 'identity-1',
    phone: '0123456789',
    request_id: 'req-1'
  });

  assert.deepEqual(response, {
    identity_id: 'identity-1',
    profile_id: 'candidate-profile-1'
  });
});

test('converts conflict errors into ALREADY_EXISTS gRPC payloads', async () => {
  const useCase = {
    execute: async () => {
      throw new CandidateProfileAlreadyExistsError('identity-1');
    }
  } as unknown as CreateCandidateProfileUseCase;
  const controller = new CandidateGrpcController(useCase);

  await assert.rejects(
    async () =>
      controller.createCandidateProfile({
        full_name: 'Candidate Name',
        identity_id: 'identity-1',
        phone: '0123456789',
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
          'Candidate profile already exists for identity: identity-1'
      );
    }
  );
});
