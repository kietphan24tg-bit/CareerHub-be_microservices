import type { PrismaClientLike } from '@careerhub/infrastructure';
import type {
  RegistrationFlow,
  RegistrationRole,
  RegistrationSagaStatus,
  RegistrationSagaStepCompensationStatus,
  RegistrationSagaStepName,
  RegistrationSagaStepStatus
} from '../../../application';

export type RegistrationSagaPersistenceRecord = {
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
  profilePayloadJson: string | null;
  requestId: string | null;
  role: RegistrationRole;
  status: RegistrationSagaStatus;
  updatedAt: Date;
};

export type RegistrationSagaStepPersistenceRecord = {
  attempts: number;
  compensatedAt: Date | null;
  compensationStatus: RegistrationSagaStepCompensationStatus;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  lastError: string | null;
  resultSnapshotJson: string | null;
  sagaId: string;
  startedAt: Date | null;
  status: RegistrationSagaStepStatus;
  stepName: RegistrationSagaStepName;
  updatedAt: Date;
};

export type RegistrationSagaPersistenceRecordWithSteps =
  RegistrationSagaPersistenceRecord & {
    steps: RegistrationSagaStepPersistenceRecord[];
  };

export type RegistrationSagaCreateInput = {
  email: string;
  flow: RegistrationFlow;
  id: string;
  profilePayloadJson?: string | null;
  requestId?: string | null;
  role: RegistrationRole;
  status: RegistrationSagaStatus;
};

export type RegistrationSagaUpdateInput = Partial<
  Omit<RegistrationSagaPersistenceRecord, 'createdAt' | 'email' | 'flow' | 'id' | 'requestId' | 'role' | 'updatedAt'>
>;

export type RegistrationSagaStepCreateInput = {
  id: string;
  sagaId: string;
  stepName: RegistrationSagaStepName;
  status: RegistrationSagaStepStatus;
};

export type RegistrationSagaStepUpdateInput = Partial<
  Omit<
    RegistrationSagaStepPersistenceRecord,
    'attempts' | 'createdAt' | 'id' | 'sagaId' | 'stepName' | 'updatedAt'
  >
> & {
  attempts?: {
    increment: number;
  };
};

export type RegistrationSagaModelDelegate = {
  create(args: {
    data: RegistrationSagaCreateInput;
  }): Promise<RegistrationSagaPersistenceRecord>;
  findMany(args: {
    include?: {
      steps?: true;
    };
    orderBy?: {
      updatedAt: 'asc' | 'desc';
    };
    take?: number;
    where?: Record<string, unknown>;
  }): Promise<RegistrationSagaPersistenceRecordWithSteps[]>;
  findUnique(args: {
    include?: {
      steps?: true;
    };
    where: {
      requestId: string;
    };
  }): Promise<RegistrationSagaPersistenceRecordWithSteps | null>;
  update(args: {
    data: RegistrationSagaUpdateInput;
    where: {
      id: string;
    };
  }): Promise<RegistrationSagaPersistenceRecord>;
  updateMany(args: {
    data: RegistrationSagaUpdateInput;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type RegistrationSagaStepModelDelegate = {
  createMany(args: {
    data: RegistrationSagaStepCreateInput[];
  }): Promise<{ count: number }>;
  updateMany(args: {
    data: RegistrationSagaStepUpdateInput;
    where: {
      sagaId: string;
      stepName: RegistrationSagaStepName;
    };
  }): Promise<{ count: number }>;
};

export type WorkflowPrismaClient = PrismaClientLike & {
  $transaction: <T>(
    operation: (tx: WorkflowPrismaClient) => Promise<T>
  ) => Promise<T>;
  registrationSaga: RegistrationSagaModelDelegate;
  registrationSagaStep: RegistrationSagaStepModelDelegate;
};
