import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateProfileAlreadyExistsError } from '../../../application/errors/candidate-profile-already-exists.error';
import { CandidateProfileNotFoundError } from '../../../application/errors/candidate-profile-not-found.error';
import { CreateCandidateProfileUseCase } from '../../../application/profiles/use-cases/create-candidate-profile.use-case';
import { GetCandidateProfileByIdentityIdUseCase } from '../../../application/profiles/use-cases/get-candidate-profile-by-identity-id.use-case';
import { UpdateCandidateProfileUseCase } from '../../../application/profiles/use-cases/update-candidate-profile.use-case';
import { CandidateGrpcController } from './candidate.grpc.controller';

test('maps create-candidate-profile request and response', async () => {
  const useCase = {
    execute: async () => ({
      identityId: 'identity-1',
      profileId: 'candidate-profile-1'
    })
  } as unknown as CreateCandidateProfileUseCase;
  const controller = new CandidateGrpcController(
    useCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as GetCandidateProfileByIdentityIdUseCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateCandidateProfileUseCase
  );

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
  const controller = new CandidateGrpcController(
    useCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as GetCandidateProfileByIdentityIdUseCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateCandidateProfileUseCase
  );

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

test('maps get-candidate-profile request and response', async () => {
  const controller = new CandidateGrpcController(
    { execute: async () => ({ identityId: 'identity-1', profileId: 'candidate-profile-1' }) } as unknown as CreateCandidateProfileUseCase,
    {
      execute: async () => ({
        address: null,
        avatarUrl: null,
        bio: null,
        createdAt: new Date('2026-06-06T00:00:00.000Z'),
        fullName: 'Candidate Name',
        githubUrl: null,
        headline: null,
        id: 'candidate-profile-1',
        identityId: 'identity-1',
        linkedinUrl: null,
        phone: '0123456789',
        portfolioUrl: null,
        updatedAt: new Date('2026-06-06T01:00:00.000Z'),
        yearsExperience: 3
      })
    } as unknown as GetCandidateProfileByIdentityIdUseCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateCandidateProfileUseCase
  );

  const response = await controller.getCandidateProfileByIdentityId({
    identity_id: 'identity-1',
    request_id: 'req-1'
  });

  assert.equal(response.profile.id, 'candidate-profile-1');
  assert.equal(response.profile.full_name, 'Candidate Name');
  assert.equal(response.profile.years_experience, 3);
});

test('converts not found candidate profile errors into NOT_FOUND gRPC payloads', async () => {
  const controller = new CandidateGrpcController(
    { execute: async () => ({ identityId: 'identity-1', profileId: 'candidate-profile-1' }) } as unknown as CreateCandidateProfileUseCase,
    {
      execute: async () => {
        throw new CandidateProfileNotFoundError('identity-404');
      }
    } as unknown as GetCandidateProfileByIdentityIdUseCase,
    { execute: async () => { throw new Error('unused'); } } as unknown as UpdateCandidateProfileUseCase
  );

  await assert.rejects(
    async () =>
      controller.getCandidateProfileByIdentityId({
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
