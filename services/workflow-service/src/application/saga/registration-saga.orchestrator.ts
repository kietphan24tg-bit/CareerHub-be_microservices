import { Logger } from '@nestjs/common';
import type {
  ActivateIdentityResponse,
  GetCandidateProfileByIdentityIdResponse,
  GetCurrentIdentityResponse,
  GetEmployerProfileByIdentityIdResponse,
  RegisterIdentityResponse
} from '@careerhub/contracts';
import type { RegisterCandidateCommand } from '../commands/register-candidate/register-candidate.command';
import type { RegisterCandidateResult } from '../commands/register-candidate/register-candidate.result';
import type { RegisterEmployerCommand } from '../commands/register-employer/register-employer.command';
import type { RegisterEmployerResult } from '../commands/register-employer/register-employer.result';
import { RegistrationRequestConflictError } from '../errors/registration-request-conflict.error';
import type { IdGenerator } from '../ports/id-generator.port';
import type { RegistrationSagaRepository } from '../ports/registration-saga-repository.port';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';
import { IamGrpcClient } from '../../infrastructure/transport/grpc/iam-grpc.client';
import { getErrorCode, getErrorMessage } from './saga-error.utils';
import {
  REGISTRATION_SAGA_STEP_NAMES,
  type CandidateRegistrationProfilePayload,
  type EmployerRegistrationProfilePayload,
  type RegistrationFlow,
  type RegistrationRole,
  type RegistrationSagaExecutionResult,
  type RegistrationSagaProfilePayload,
  type RegistrationSagaRecord,
  type RegistrationSagaStepName,
  type RegistrationSagaStepRecord
} from './registration-saga.types';

type ExistingProfileRecord = {
  profileId: string;
};

type ExecuteRegistrationInput = {
  email: string;
  flow: RegistrationFlow;
  profilePayload: RegistrationSagaProfilePayload;
  registerIdentityRequest: {
    accepted_terms: boolean;
    email: string;
    password: string;
    role: RegistrationRole;
  };
  requestId?: string;
  role: RegistrationRole;
};

type RecoveryCompensationInput = {
  compensateProfile: boolean;
  failedStep: RegistrationSagaStepName;
  identityId: string;
  reason: string;
  requestId?: string;
  role: RegistrationRole;
  sagaId: string;
};

export class RegistrationSagaOrchestrator {
  private readonly logger = new Logger(RegistrationSagaOrchestrator.name);

  constructor(
    private readonly registrationSagaRepository: RegistrationSagaRepository,
    private readonly idGenerator: IdGenerator,
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient
  ) {}

  async registerCandidate(
    command: RegisterCandidateCommand
  ): Promise<RegisterCandidateResult> {
    return this.executeRegistration({
      email: command.email,
      flow: 'candidate_registration',
      profilePayload: {
        kind: 'candidate',
        payload: {
          fullName: command.fullName,
          phone: command.phone
        }
      },
      registerIdentityRequest: {
        accepted_terms: command.acceptTerms,
        email: command.email,
        password: command.password,
        role: 'candidate'
      },
      requestId: command.requestId,
      role: 'candidate'
    });
  }

  async registerEmployer(
    command: RegisterEmployerCommand
  ): Promise<RegisterEmployerResult> {
    return this.executeRegistration({
      email: command.companyEmail,
      flow: 'employer_registration',
      profilePayload: {
        kind: 'employer',
        payload: {
          address: command.address,
          companyName: command.companyName,
          fullName: command.fullName,
          industry: command.industry,
          phone: command.phone
        }
      },
      registerIdentityRequest: {
        accepted_terms: command.acceptTerms,
        email: command.companyEmail,
        password: command.password,
        role: 'employer'
      },
      requestId: command.requestId,
      role: 'employer'
    });
  }

  async recoverStaleSagas(input: {
    limit: number;
    staleBefore: Date;
  }): Promise<number> {
    const claimedSagas =
      await this.registrationSagaRepository.findAndClaimRecoverableBatch(input);

    if (claimedSagas.length === 0) {
      return 0;
    }

    const recoveryResults = await Promise.allSettled(
      claimedSagas.map((saga) => this.recoverSaga(saga))
    );

    recoveryResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        return;
      }

      const saga = claimedSagas[index];
      this.logger.error(
        `Failed to recover registration saga ${saga?.id ?? 'unknown'}`,
        result.reason instanceof Error ? result.reason.stack : undefined
      );
    });

    return claimedSagas.length;
  }

  private async executeRegistration(
    input: ExecuteRegistrationInput
  ): Promise<RegistrationSagaExecutionResult> {
    const existingSaga = await this.findExistingSaga(input.requestId);

    if (existingSaga) {
      return this.toCompletedResult(existingSaga);
    }

    const saga = await this.registrationSagaRepository.createSaga({
      email: input.email,
      flow: input.flow,
      id: this.idGenerator.generate(),
      profilePayload: input.profilePayload,
      requestId: input.requestId,
      role: input.role,
      steps: [
        {
          id: this.idGenerator.generate(),
          stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
        },
        {
          id: this.idGenerator.generate(),
          stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
        },
        {
          id: this.idGenerator.generate(),
          stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
        }
      ]
    });

    let identity: RegisterIdentityResponse;

    await this.startStep(
      saga.id,
      REGISTRATION_SAGA_STEP_NAMES.registerIdentity
    );

    try {
      identity = await this.iamGrpcClient.registerIdentity(
        input.registerIdentityRequest,
        input.requestId
      );
    } catch (error) {
      await this.failSaga(
        saga.id,
        REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
        error
      );
      throw error;
    }

    await this.completeStep(
      saga.id,
      REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
      {
        createdAt: identity.created_at,
        identityId: identity.identity_id,
        status: identity.status
      },
      {
        identityId: identity.identity_id
      }
    );

    await this.runCreateProfileStep({
      identityId: identity.identity_id,
      profilePayload: input.profilePayload,
      requestId: input.requestId,
      role: input.role,
      sagaId: saga.id
    });

    return this.runActivateIdentityStep({
      email: input.email,
      identityId: identity.identity_id,
      requestId: input.requestId,
      role: input.role,
      sagaId: saga.id
    });
  }

  private async recoverSaga(saga: RegistrationSagaRecord): Promise<void> {
    const registerIdentityStep = this.getRequiredStep(
      saga,
      REGISTRATION_SAGA_STEP_NAMES.registerIdentity
    );
    const createProfileStep = this.getRequiredStep(
      saga,
      REGISTRATION_SAGA_STEP_NAMES.createProfile
    );
    const activateIdentityStep = this.getRequiredStep(
      saga,
      REGISTRATION_SAGA_STEP_NAMES.activateIdentity
    );
    const identityId = this.resolveIdentityId(saga);

    if (!identityId) {
      await this.abandonSaga(
        saga.id,
        REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
        new Error(
          `Unable to resolve identity id while recovering saga ${saga.id}`
        )
      );
      return;
    }

    if (!saga.identityId) {
      await this.registrationSagaRepository.updateSaga(saga.id, {
        identityId
      });
    }

    if (createProfileStep.status === 'FAILED') {
      await this.recoverFailedCreateProfileStep({
        identityId,
        saga
      });
      return;
    }

    if (activateIdentityStep.status === 'FAILED') {
      await this.recoverFailedActivateIdentityStep({
        identityId,
        saga
      });
      return;
    }

    if (
      saga.status === 'COMPENSATING' ||
      saga.status === 'COMPENSATION_FAILED' ||
      registerIdentityStep.compensationStatus !== 'NOT_REQUIRED' ||
      createProfileStep.compensationStatus !== 'NOT_REQUIRED'
    ) {
      await this.resumeCompensation({
        compensateProfile:
          createProfileStep.status === 'COMPLETED' ||
          createProfileStep.compensationStatus !== 'NOT_REQUIRED' ||
          saga.profileId !== null,
        failedStep:
          saga.lastStep ?? REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        identityId,
        reason: 'resuming compensation for stale saga',
        requestId: saga.requestId ?? undefined,
        role: saga.role,
        sagaId: saga.id
      });
      return;
    }

    if (registerIdentityStep.status !== 'COMPLETED') {
      await this.abandonSaga(
        saga.id,
        REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
        new Error(
          `Saga ${saga.id} cannot resume because REGISTER_IDENTITY did not complete`
        )
      );
      return;
    }

    if (createProfileStep.status !== 'COMPLETED') {
      if (!saga.profilePayload) {
        await this.abandonSaga(
          saga.id,
          REGISTRATION_SAGA_STEP_NAMES.createProfile,
          new Error(
            `Saga ${saga.id} is missing persisted profile payload for recovery`
          )
        );
        return;
      }

      await this.runCreateProfileStep({
        identityId,
        profilePayload: saga.profilePayload,
        requestId: saga.requestId ?? undefined,
        role: saga.role,
        sagaId: saga.id
      });
    } else if (!saga.profileId) {
      const profileId = this.resolveProfileId(saga);

      if (profileId) {
        await this.registrationSagaRepository.updateSaga(saga.id, {
          profileId
        });
      }
    }

    if (activateIdentityStep.status === 'COMPLETED') {
      await this.completeRecoveredSaga(
        saga.id,
        saga.email,
        identityId
      );
      return;
    }

    await this.runActivateIdentityStep({
      email: saga.email,
      identityId,
      requestId: saga.requestId ?? undefined,
      role: saga.role,
      sagaId: saga.id
    });
  }

  private async runCreateProfileStep(input: {
    identityId: string;
    profilePayload: RegistrationSagaProfilePayload;
    requestId?: string;
    role: RegistrationRole;
    sagaId: string;
  }): Promise<ExistingProfileRecord> {
    await this.startStep(
      input.sagaId,
      REGISTRATION_SAGA_STEP_NAMES.createProfile
    );

    try {
      const profile = await this.createProfile(
        input.identityId,
        input.role,
        input.profilePayload,
        input.requestId
      );

      await this.completeStep(
        input.sagaId,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        {
          profileId: profile.profileId
        },
        {
          profileId: profile.profileId
        }
      );

      return profile;
    } catch (error) {
      let existingProfile: ExistingProfileRecord | null;

      try {
        existingProfile = await this.loadExistingProfile(
          input.identityId,
          input.role,
          input.requestId
        );
      } catch (recoveryReadError) {
        await this.failSaga(
          input.sagaId,
          REGISTRATION_SAGA_STEP_NAMES.createProfile,
          recoveryReadError
        );
        throw recoveryReadError;
      }

      if (existingProfile) {
        this.logger.warn(
          `Profile creation reported failure but saga ${input.sagaId} found an existing profile for identity ${input.identityId}`
        );
        await this.completeStep(
          input.sagaId,
          REGISTRATION_SAGA_STEP_NAMES.createProfile,
          {
            profileId: existingProfile.profileId,
            recoveredByRead: true
          },
          {
            profileId: existingProfile.profileId
          }
        );

        return existingProfile;
      }

      await this.failSaga(
        input.sagaId,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        error
      );
      await this.resumeCompensation({
        compensateProfile: false,
        failedStep: REGISTRATION_SAGA_STEP_NAMES.createProfile,
        identityId: input.identityId,
        reason: 'profile creation failed',
        requestId: input.requestId,
        role: input.role,
        sagaId: input.sagaId
      });
      throw error;
    }
  }

  private async recoverFailedCreateProfileStep(input: {
    identityId: string;
    saga: RegistrationSagaRecord;
  }): Promise<void> {
    let existingProfile: ExistingProfileRecord | null;

    try {
      existingProfile = await this.loadExistingProfile(
        input.identityId,
        input.saga.role,
        input.saga.requestId ?? undefined
      );
    } catch (error) {
      await this.failSaga(
        input.saga.id,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        error
      );
      return;
    }

    if (existingProfile) {
      this.logger.warn(
        `Recovered failed profile creation for saga ${input.saga.id} by reading downstream profile state`
      );
      await this.completeStep(
        input.saga.id,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        {
          profileId: existingProfile.profileId,
          recoveredByRead: true
        },
        {
          profileId: existingProfile.profileId
        }
      );

      await this.runActivateIdentityStep({
        email: input.saga.email,
        identityId: input.identityId,
        requestId: input.saga.requestId ?? undefined,
        role: input.saga.role,
        sagaId: input.saga.id
      });
      return;
    }

    await this.resumeCompensation({
      compensateProfile: false,
      failedStep: REGISTRATION_SAGA_STEP_NAMES.createProfile,
      identityId: input.identityId,
      reason: 'resuming compensation after profile creation failure',
      requestId: input.saga.requestId ?? undefined,
      role: input.saga.role,
      sagaId: input.saga.id
    });
  }

  private async runActivateIdentityStep(input: {
    email: string;
    identityId: string;
    requestId?: string;
    role: RegistrationRole;
    sagaId: string;
  }): Promise<RegistrationSagaExecutionResult> {
    await this.startStep(
      input.sagaId,
      REGISTRATION_SAGA_STEP_NAMES.activateIdentity
    );

    try {
      const activation = await this.iamGrpcClient.activateIdentity(
        {
          identity_id: input.identityId
        },
        input.requestId
      );

      return this.completeSagaFromActivation(
        input.sagaId,
        input.email,
        input.role,
        activation
      );
    } catch (error) {
      let currentIdentity: GetCurrentIdentityResponse | null;

      try {
        currentIdentity = await this.readCurrentIdentityOrNull(
          input.identityId,
          input.requestId
        );
      } catch (recoveryReadError) {
        await this.failSaga(
          input.sagaId,
          REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
          recoveryReadError
        );
        throw recoveryReadError;
      }

      if (currentIdentity?.status === 'active') {
        this.logger.warn(
          `Identity activation reported failure but identity ${input.identityId} is already active for saga ${input.sagaId}`
        );

        return this.completeSagaFromCurrentIdentity(
          input.sagaId,
          currentIdentity
        );
      }

      await this.failSaga(
        input.sagaId,
        REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        error
      );
      await this.resumeCompensation({
        compensateProfile: true,
        failedStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        identityId: input.identityId,
        reason: 'identity activation failed',
        requestId: input.requestId,
        role: input.role,
        sagaId: input.sagaId
      });
      throw error;
    }
  }

  private async recoverFailedActivateIdentityStep(input: {
    identityId: string;
    saga: RegistrationSagaRecord;
  }): Promise<void> {
    let currentIdentity: GetCurrentIdentityResponse | null;

    try {
      currentIdentity = await this.readCurrentIdentityOrNull(
        input.identityId,
        input.saga.requestId ?? undefined
      );
    } catch (error) {
      await this.failSaga(
        input.saga.id,
        REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        error
      );
      return;
    }

    if (currentIdentity?.status === 'active') {
      this.logger.warn(
        `Recovered failed identity activation for saga ${input.saga.id} because the identity is already active downstream`
      );
      await this.completeSagaFromCurrentIdentity(
        input.saga.id,
        currentIdentity
      );
      return;
    }

    await this.resumeCompensation({
      compensateProfile: true,
      failedStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
      identityId: input.identityId,
      reason: 'resuming compensation after identity activation failure',
      requestId: input.saga.requestId ?? undefined,
      role: input.saga.role,
      sagaId: input.saga.id
    });
  }

  private async createProfile(
    identityId: string,
    role: RegistrationRole,
    profilePayload: RegistrationSagaProfilePayload,
    requestId?: string
  ): Promise<ExistingProfileRecord> {
    if (role === 'candidate') {
      const payload = this.assertCandidateProfilePayload(profilePayload);
      const response = await this.candidateGrpcClient.createCandidateProfile(
        {
          full_name: payload.fullName,
          identity_id: identityId,
          phone: payload.phone
        },
        requestId
      );

      return {
        profileId: response.profile_id
      };
    }

    const payload = this.assertEmployerProfilePayload(profilePayload);
    const response = await this.employerGrpcClient.createEmployerProfile(
      {
        address: payload.address,
        company_name: payload.companyName,
        contact_name: payload.fullName,
        contact_phone: payload.phone,
        identity_id: identityId,
        industry: payload.industry
      },
      requestId
    );

    return {
      profileId: response.profile_id
    };
  }

  private async deleteProfileCompensation(
    identityId: string,
    role: RegistrationRole,
    requestId?: string
  ): Promise<boolean> {
    if (role === 'candidate') {
      const response =
        await this.candidateGrpcClient.deleteCandidateProfileCompensation(
          {
            identity_id: identityId
          },
          requestId
        );

      return response.compensated;
    }

    const response =
      await this.employerGrpcClient.deleteEmployerProfileCompensation(
        {
          identity_id: identityId
        },
        requestId
      );

    return response.compensated;
  }

  private async loadExistingProfile(
    identityId: string,
    role: RegistrationRole,
    requestId?: string
  ): Promise<ExistingProfileRecord | null> {
    try {
      if (role === 'candidate') {
        const response =
          await this.candidateGrpcClient.getCandidateProfileByIdentityId(
            {
              identity_id: identityId
            },
            requestId
          );

        return this.toExistingCandidateProfile(response);
      }

      const response =
        await this.employerGrpcClient.getEmployerProfileByIdentityId(
          {
            identity_id: identityId
          },
          requestId
        );

      return this.toExistingEmployerProfile(response);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  private async readCurrentIdentityOrNull(
    identityId: string,
    requestId?: string
  ): Promise<GetCurrentIdentityResponse | null> {
    try {
      return await this.iamGrpcClient.getCurrentIdentity(
        {
          identity_id: identityId
        },
        requestId
      );
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  private async resumeCompensation(
    input: RecoveryCompensationInput
  ): Promise<void> {
    await this.registrationSagaRepository.updateSaga(input.sagaId, {
      lastStep: input.failedStep,
      status: 'COMPENSATING'
    });

    const compensationTasks: Array<Promise<boolean>> = [];

    if (input.compensateProfile) {
      compensationTasks.push(
        this.compensateProfileCreation(
          input.sagaId,
          input.identityId,
          input.requestId,
          input.reason,
          input.role
        )
      );
    } else {
      compensationTasks.push(Promise.resolve(true));
    }

    compensationTasks.push(
      this.compensateIdentityRegistration(
        input.sagaId,
        input.identityId,
        input.requestId,
        input.reason
      )
    );

    const [profileCompensated, identityCompensated] =
      await Promise.all(compensationTasks);

    await this.finalizeCompensation(
      input.sagaId,
      profileCompensated && identityCompensated
    );
  }

  private async findExistingSaga(
    requestId: string | undefined
  ): Promise<RegistrationSagaRecord | null> {
    if (!requestId) {
      return null;
    }

    const existingSaga =
      await this.registrationSagaRepository.findByRequestId(requestId);

    if (!existingSaga) {
      return null;
    }

    if (existingSaga.status === 'COMPLETED' && existingSaga.identityId) {
      return existingSaga;
    }

    throw new RegistrationRequestConflictError(
      requestId,
      existingSaga.status,
      existingSaga.id
    );
  }

  private async startStep(
    sagaId: string,
    stepName: RegistrationSagaStepName
  ): Promise<void> {
    const now = new Date();

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        lastStep: stepName,
        status: 'IN_PROGRESS'
      }),
      this.registrationSagaRepository.updateStep(sagaId, stepName, {
        attemptsIncrement: 1,
        lastError: null,
        startedAt: now,
        status: 'IN_PROGRESS'
      })
    ]);
  }

  private async completeStep(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    resultSnapshot: Record<string, unknown>,
    sagaPatch: {
      identityId?: string;
      profileId?: string;
    } = {}
  ): Promise<void> {
    const now = new Date();

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        ...sagaPatch,
        lastStep: stepName,
        status: 'IN_PROGRESS'
      }),
      this.registrationSagaRepository.updateStep(sagaId, stepName, {
        completedAt: now,
        lastError: null,
        resultSnapshot,
        status: 'COMPLETED'
      })
    ]);
  }

  private async failSaga(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    error: unknown
  ): Promise<void> {
    const failureCode = getErrorCode(error);
    const failureMessage = getErrorMessage(error);

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        failureCode,
        failureMessage,
        lastStep: stepName,
        status: 'FAILED'
      }),
      this.registrationSagaRepository.updateStep(sagaId, stepName, {
        lastError: failureMessage,
        status: 'FAILED'
      })
    ]);
  }

  // Marks a saga as terminally unrecoverable so the recovery poller stops
  // re-claiming it. Used for dead-ends with nothing left to do or roll back
  // (e.g. identity was never created, or persisted state is incomplete).
  private async abandonSaga(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    error: unknown
  ): Promise<void> {
    const failureCode = getErrorCode(error);
    const failureMessage = getErrorMessage(error);

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        failureCode,
        failureMessage,
        lastStep: stepName,
        status: 'ABANDONED'
      }),
      this.registrationSagaRepository.updateStep(sagaId, stepName, {
        lastError: failureMessage,
        status: 'FAILED'
      })
    ]);

    this.logger.warn(
      `Registration saga ${sagaId} abandoned at ${stepName}: ${failureMessage}`
    );
  }

  private async compensateIdentityRegistration(
    sagaId: string,
    identityId: string,
    requestId: string | undefined,
    reason: string
  ): Promise<boolean> {
    await this.registrationSagaRepository.updateStep(
      sagaId,
      REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
      {
        compensationStatus: 'IN_PROGRESS'
      }
    );

    try {
      const response = await this.iamGrpcClient.cancelPendingIdentity(
        {
          identity_id: identityId
        },
        requestId
      );

      await this.registrationSagaRepository.updateStep(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
        {
          compensatedAt: new Date(),
          compensationStatus: response.cancelled ? 'COMPENSATED' : 'FAILED',
          resultSnapshot: {
            cancelled: response.cancelled
          }
        }
      );

      return response.cancelled;
    } catch (error) {
      this.logger.error(
        `Failed to compensate identity ${identityId} for saga ${sagaId}: ${reason}`,
        error instanceof Error ? error.stack : undefined
      );
      await this.markCompensationFailure(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
        error
      );
      return false;
    }
  }

  private async compensateProfileCreation(
    sagaId: string,
    identityId: string,
    requestId: string | undefined,
    reason: string,
    role: RegistrationRole
  ): Promise<boolean> {
    await this.registrationSagaRepository.updateStep(
      sagaId,
      REGISTRATION_SAGA_STEP_NAMES.createProfile,
      {
        compensationStatus: 'IN_PROGRESS'
      }
    );

    try {
      const compensated = await this.deleteProfileCompensation(
        identityId,
        role,
        requestId
      );

      await this.markCompensationResult(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        compensated,
        reason
      );

      return compensated;
    } catch (error) {
      await this.markCompensationFailure(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.createProfile,
        error
      );
      this.logger.error(
        `Failed to compensate profile for identity ${identityId} in saga ${sagaId}: ${reason}`,
        error instanceof Error ? error.stack : undefined
      );
      return false;
    }
  }

  private async markCompensationResult(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    compensated: boolean,
    reason: string
  ): Promise<void> {
    if (!compensated) {
      await this.markCompensationFailure(
        sagaId,
        stepName,
        new Error(`Compensation returned false: ${reason}`)
      );
      return;
    }

    await this.registrationSagaRepository.updateStep(sagaId, stepName, {
      compensatedAt: new Date(),
      compensationStatus: 'COMPENSATED'
    });
  }

  private async markCompensationFailure(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    error: unknown
  ): Promise<void> {
    await this.registrationSagaRepository.updateStep(sagaId, stepName, {
      compensationStatus: 'FAILED',
      lastError: getErrorMessage(error)
    });
  }

  private async finalizeCompensation(
    sagaId: string,
    fullyCompensated: boolean
  ): Promise<void> {
    await this.registrationSagaRepository.updateSaga(sagaId, {
      compensatedAt: new Date(),
      status: fullyCompensated ? 'COMPENSATED' : 'COMPENSATION_FAILED'
    });
  }

  private async completeSagaFromActivation(
    sagaId: string,
    email: string,
    role: RegistrationRole,
    activation: ActivateIdentityResponse
  ): Promise<RegistrationSagaExecutionResult> {
    const now = new Date();

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        completedAt: now,
        lastStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        status: 'COMPLETED'
      }),
      this.registrationSagaRepository.updateStep(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        {
          completedAt: now,
          lastError: null,
          resultSnapshot: {
            identityId: activation.identity_id,
            status: activation.status
          },
          status: 'COMPLETED'
        }
      )
    ]);

    return {
      email,
      identityId: activation.identity_id,
      role,
      sagaId,
      status: 'COMPLETED'
    };
  }

  private async completeSagaFromCurrentIdentity(
    sagaId: string,
    currentIdentity: GetCurrentIdentityResponse
  ): Promise<RegistrationSagaExecutionResult> {
    const now = new Date();

    await Promise.all([
      this.registrationSagaRepository.updateSaga(sagaId, {
        completedAt: now,
        identityId: currentIdentity.identity_id,
        lastStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        status: 'COMPLETED'
      }),
      this.registrationSagaRepository.updateStep(
        sagaId,
        REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
        {
          completedAt: now,
          lastError: null,
          resultSnapshot: {
            identityId: currentIdentity.identity_id,
            recoveredByRead: true,
            status: currentIdentity.status
          },
          status: 'COMPLETED'
        }
      )
    ]);

    return {
      email: currentIdentity.email,
      identityId: currentIdentity.identity_id,
      role: currentIdentity.role as RegistrationRole,
      sagaId,
      status: 'COMPLETED'
    };
  }

  private async completeRecoveredSaga(
    sagaId: string,
    email: string,
    identityId: string
  ): Promise<void> {
    await this.registrationSagaRepository.updateSaga(sagaId, {
      completedAt: new Date(),
      identityId,
      lastStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
      status: 'COMPLETED'
    });
    this.logger.log(
      `Recovered registration saga ${sagaId} as COMPLETED for ${email}`
    );
  }

  private getRequiredStep(
    saga: RegistrationSagaRecord,
    stepName: RegistrationSagaStepName
  ): RegistrationSagaStepRecord {
    const step = saga.steps.find((candidate) => candidate.stepName === stepName);

    if (!step) {
      throw new Error(`Missing ${stepName} for saga ${saga.id}`);
    }

    return step;
  }

  private resolveIdentityId(saga: RegistrationSagaRecord): string | null {
    if (saga.identityId) {
      return saga.identityId;
    }

    const registerIdentityStep = saga.steps.find(
      (step) => step.stepName === REGISTRATION_SAGA_STEP_NAMES.registerIdentity
    );
    const registerIdentityValue = registerIdentityStep?.resultSnapshot?.identityId;

    if (typeof registerIdentityValue === 'string' && registerIdentityValue.length > 0) {
      return registerIdentityValue;
    }

    const activationStep = saga.steps.find(
      (step) => step.stepName === REGISTRATION_SAGA_STEP_NAMES.activateIdentity
    );
    const activationValue = activationStep?.resultSnapshot?.identityId;

    return typeof activationValue === 'string' && activationValue.length > 0
      ? activationValue
      : null;
  }

  private resolveProfileId(saga: RegistrationSagaRecord): string | null {
    if (saga.profileId) {
      return saga.profileId;
    }

    const createProfileStep = saga.steps.find(
      (step) => step.stepName === REGISTRATION_SAGA_STEP_NAMES.createProfile
    );
    const profileValue = createProfileStep?.resultSnapshot?.profileId;

    return typeof profileValue === 'string' && profileValue.length > 0
      ? profileValue
      : null;
  }

  private isNotFoundError(error: unknown): boolean {
    return getErrorCode(error) === 'NOT_FOUND';
  }

  private assertCandidateProfilePayload(
    payload: RegistrationSagaProfilePayload
  ): CandidateRegistrationProfilePayload {
    if (payload.kind === 'candidate') {
      return payload.payload;
    }

    throw new Error('Candidate registration payload is missing or invalid');
  }

  private assertEmployerProfilePayload(
    payload: RegistrationSagaProfilePayload
  ): EmployerRegistrationProfilePayload {
    if (payload.kind === 'employer') {
      return payload.payload;
    }

    throw new Error('Employer registration payload is missing or invalid');
  }

  private toCompletedResult(
    saga: RegistrationSagaRecord
  ): RegistrationSagaExecutionResult {
    if (!saga.identityId) {
      throw new RegistrationRequestConflictError(
        saga.requestId ?? saga.id,
        saga.status,
        saga.id
      );
    }

    return {
      email: saga.email,
      identityId: saga.identityId,
      role: saga.role,
      sagaId: saga.id,
      status: 'COMPLETED'
    };
  }

  private toExistingCandidateProfile(
    response: GetCandidateProfileByIdentityIdResponse
  ): ExistingProfileRecord {
    return {
      profileId: response.profile.id
    };
  }

  private toExistingEmployerProfile(
    response: GetEmployerProfileByIdentityIdResponse
  ): ExistingProfileRecord {
    return {
      profileId: response.profile.id
    };
  }
}
