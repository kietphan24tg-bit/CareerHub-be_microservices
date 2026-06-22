import type {
  RegistrationFlow,
  RegistrationSagaProfilePayload,
  RegistrationRole,
  RegistrationSagaRecord,
  RegistrationSagaStatus,
  RegistrationSagaStepCompensationStatus,
  RegistrationSagaStepName,
  RegistrationSagaStepResult,
  RegistrationSagaStepStatus
} from '../saga/registration-saga.types';

export type CreateRegistrationSagaInput = {
  email: string;
  flow: RegistrationFlow;
  id: string;
  profilePayload: RegistrationSagaProfilePayload;
  requestId?: string;
  role: RegistrationRole;
  steps: Array<{
    id: string;
    stepName: RegistrationSagaStepName;
  }>;
};

export type UpdateRegistrationSagaPatch = {
  compensatedAt?: Date | null;
  completedAt?: Date | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  identityId?: string | null;
  lastStep?: RegistrationSagaStepName | null;
  profileId?: string | null;
  status?: RegistrationSagaStatus;
};

export type UpdateRegistrationSagaStepPatch = {
  attemptsIncrement?: number;
  compensatedAt?: Date | null;
  compensationStatus?: RegistrationSagaStepCompensationStatus;
  completedAt?: Date | null;
  lastError?: string | null;
  resultSnapshot?: RegistrationSagaStepResult | null;
  startedAt?: Date | null;
  status?: RegistrationSagaStepStatus;
};

export interface RegistrationSagaRepository {
  findAndClaimRecoverableBatch(input: {
    limit: number;
    staleBefore: Date;
  }): Promise<RegistrationSagaRecord[]>;
  createSaga(input: CreateRegistrationSagaInput): Promise<RegistrationSagaRecord>;
  findByRequestId(requestId: string): Promise<RegistrationSagaRecord | null>;
  updateSaga(sagaId: string, patch: UpdateRegistrationSagaPatch): Promise<void>;
  updateStep(
    sagaId: string,
    stepName: RegistrationSagaStepName,
    patch: UpdateRegistrationSagaStepPatch
  ): Promise<void>;
}
