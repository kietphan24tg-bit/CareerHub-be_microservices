export const REGISTRATION_SAGA_STEP_NAMES = {
  activateIdentity: 'ACTIVATE_IDENTITY',
  createProfile: 'CREATE_PROFILE',
  registerIdentity: 'REGISTER_IDENTITY'
} as const;

export type RegistrationFlow =
  | 'candidate_registration'
  | 'employer_registration';

export type RegistrationRole = 'candidate' | 'employer';

export type RegistrationSagaStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'RECOVERING'
  | 'COMPENSATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATED'
  | 'COMPENSATION_FAILED';

export type CandidateRegistrationProfilePayload = {
  fullName: string;
  phone: string;
};

export type EmployerRegistrationProfilePayload = {
  address: string;
  companyName: string;
  fullName: string;
  industry: string;
  phone: string;
};

export type RegistrationSagaProfilePayload =
  | {
      kind: 'candidate';
      payload: CandidateRegistrationProfilePayload;
    }
  | {
      kind: 'employer';
      payload: EmployerRegistrationProfilePayload;
    };

export type RegistrationSagaStepName =
  (typeof REGISTRATION_SAGA_STEP_NAMES)[keyof typeof REGISTRATION_SAGA_STEP_NAMES];

export type RegistrationSagaStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED';

export type RegistrationSagaStepCompensationStatus =
  | 'NOT_REQUIRED'
  | 'IN_PROGRESS'
  | 'COMPENSATED'
  | 'FAILED';

export type RegistrationSagaStepResult = Record<string, unknown>;

export type RegistrationSagaStepRecord = {
  attempts: number;
  compensatedAt: Date | null;
  compensationStatus: RegistrationSagaStepCompensationStatus;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  lastError: string | null;
  resultSnapshot: RegistrationSagaStepResult | null;
  sagaId: string;
  startedAt: Date | null;
  status: RegistrationSagaStepStatus;
  stepName: RegistrationSagaStepName;
  updatedAt: Date;
};

export type RegistrationSagaRecord = {
  compensatedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  email: string;
  failureCode: string | null;
  failureMessage: string | null;
  flow: RegistrationFlow;
  id: string;
  identityId: string | null;
  lastStep: RegistrationSagaStepName | null;
  profileId: string | null;
  profilePayload: RegistrationSagaProfilePayload | null;
  requestId: string | null;
  role: RegistrationRole;
  status: RegistrationSagaStatus;
  steps: RegistrationSagaStepRecord[];
  updatedAt: Date;
};

export type RegistrationSagaExecutionResult = {
  email: string;
  identityId: string;
  role: RegistrationRole;
  sagaId: string;
  status: 'COMPLETED';
};
