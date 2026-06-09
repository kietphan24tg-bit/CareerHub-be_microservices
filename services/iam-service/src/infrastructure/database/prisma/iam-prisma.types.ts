import type { PrismaClientLike } from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';

export type IdentityPersistenceRole = 'candidate' | 'employer';
export type IdentityPersistenceStatus = 'active' | 'disabled' | 'pending_profile';

export type IdentityPersistenceRecord = {
  acceptedTerms: boolean;
  createdAt: Date;
  email: string;
  id: string;
  passwordHash: string;
  role: IdentityPersistenceRole;
  status: IdentityPersistenceStatus;
  updatedAt: Date;
};

export type PrismaIdentityCreateInput = IdentityPersistenceRecord;

export type AuthSessionPersistenceRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  revokedAt: Date | null;
  tokenHash: string;
  updatedAt: Date;
};

export type PasswordResetTokenPersistenceRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identityId: string;
  tokenHash: string;
  usedAt: Date | null;
};

export type PrismaAuthSessionCreateInput = {
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  tokenHash: string;
};

export type PrismaPasswordResetTokenCreateInput = {
  expiresAt: Date;
  id: string;
  identityId: string;
  tokenHash: string;
};

export type OutboxPersistenceRecord = {
  eventName: string;
  id: string;
  lastError: string | null;
  nextRetryAt: Date | null;
  occurredAt: Date;
  payload: OutboxRecord['payload'];
  processingAt: Date | null;
  processedAt: Date | null;
  retryCount: number;
  status: OutboxRecord['status'];
};

export type PrismaOutboxCreateInput = {
  eventName: string;
  id: string;
  lastError?: string | null;
  nextRetryAt?: Date | null;
  occurredAt: Date;
  payload: OutboxRecord['payload'];
  processingAt?: Date | null;
  processedAt?: Date | null;
  retryCount: number;
  status: OutboxRecord['status'];
};

export type IdentityModelDelegate = {
  create(args: { data: PrismaIdentityCreateInput }): Promise<IdentityPersistenceRecord>;
  findUnique(args: {
    where: { email?: string; id?: string };
  }): Promise<IdentityPersistenceRecord | null>;
  update(args: {
    data: Partial<
      Pick<
        IdentityPersistenceRecord,
        'acceptedTerms' | 'email' | 'passwordHash' | 'role' | 'status' | 'updatedAt'
      >
    >;
    where: { id: string };
  }): Promise<IdentityPersistenceRecord>;
};

export type AuthSessionModelDelegate = {
  create(args: { data: PrismaAuthSessionCreateInput }): Promise<AuthSessionPersistenceRecord>;
  findUnique(args: {
    where: { tokenHash: string };
  }): Promise<AuthSessionPersistenceRecord | null>;
  update(args: {
    data: Partial<Pick<AuthSessionPersistenceRecord, 'expiresAt' | 'revokedAt' | 'tokenHash'>>;
    where: { id: string };
  }): Promise<AuthSessionPersistenceRecord>;
  updateMany(args: {
    data: Partial<Pick<AuthSessionPersistenceRecord, 'revokedAt'>>;
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type PasswordResetTokenModelDelegate = {
  create(args: {
    data: PrismaPasswordResetTokenCreateInput;
  }): Promise<PasswordResetTokenPersistenceRecord>;
  findUnique(args: {
    where: { tokenHash: string; id?: string };
  }): Promise<PasswordResetTokenPersistenceRecord | null>;
  update(args: {
    data: Partial<Pick<PasswordResetTokenPersistenceRecord, 'usedAt'>>;
    where: { id: string };
  }): Promise<PasswordResetTokenPersistenceRecord>;
  updateMany(args: {
    data: Partial<Pick<PasswordResetTokenPersistenceRecord, 'usedAt'>>;
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type OutboxModelDelegate = {
  count(args: { where?: Record<string, unknown> }): Promise<number>;
  create(args: { data: PrismaOutboxCreateInput }): Promise<OutboxPersistenceRecord>;
  deleteMany(args: { where?: Record<string, unknown> }): Promise<{ count: number }>;
  findFirst(args: {
    orderBy?: { occurredAt: 'asc' | 'desc' };
    select?: { occurredAt?: boolean; id?: boolean };
    where?: Record<string, unknown>;
  }): Promise<Partial<OutboxPersistenceRecord> | null>;
  findMany(args: {
    orderBy?: { occurredAt: 'asc' | 'desc' };
    select?: { id?: boolean };
    take?: number;
    where?: Record<string, unknown>;
  }): Promise<OutboxPersistenceRecord[]>;
  findUnique(args: { where: { id: string } }): Promise<OutboxPersistenceRecord | null>;
  update(args: {
    data: Partial<OutboxPersistenceRecord>;
    where: { id: string };
  }): Promise<OutboxPersistenceRecord>;
  updateMany(args: {
    data: Partial<OutboxPersistenceRecord>;
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type IamPrismaRepositoryClient = {
  authSession: AuthSessionModelDelegate;
  identity: IdentityModelDelegate;
  outbox: OutboxModelDelegate;
  passwordResetToken: PasswordResetTokenModelDelegate;
};

export type IamTransactionalPrismaClient = IamPrismaRepositoryClient;

export type IamPrismaClient = PrismaClientLike & {
  $transaction<T>(
    fn: (client: IamTransactionalPrismaClient) => Promise<T>
  ): Promise<T>;
  authSession: AuthSessionModelDelegate;
  identity: IdentityModelDelegate;
  outbox: OutboxModelDelegate;
  passwordResetToken: PasswordResetTokenModelDelegate;
};
