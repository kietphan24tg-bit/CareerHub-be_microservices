import type { PrismaClientLike } from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';

export type CandidateProfilePersistenceRecord = {
  address: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  fullName: string;
  githubUrl: string | null;
  headline: string | null;
  id: string;
  identityId: string;
  linkedinUrl: string | null;
  phone: string | null;
  portfolioUrl: string | null;
  updatedAt: Date;
  yearsExperience: number | null;
};

export type CandidateProfileCreateInput = {
  fullName: string;
  id: string;
  identityId: string;
  phone: string | null;
};

export type CandidateOutboxPersistenceRecord = {
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

export type CandidatePrismaOutboxCreateInput = {
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

export type CandidateProfileModelDelegate = {
  create(args: {
    data: CandidateProfileCreateInput;
  }): Promise<CandidateProfilePersistenceRecord>;
  findUnique(args: {
    where: { identityId: string };
  }): Promise<CandidateProfilePersistenceRecord | null>;
  update(args: {
    data: Partial<CandidateProfilePersistenceRecord>;
    where: { id: string };
  }): Promise<CandidateProfilePersistenceRecord>;
};

export type CandidateOutboxModelDelegate = {
  count(args: {
    where?: Record<string, unknown>;
  }): Promise<number>;
  create(args: {
    data: CandidatePrismaOutboxCreateInput;
  }): Promise<CandidateOutboxPersistenceRecord>;
  deleteMany(args: {
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
  findFirst(args: {
    orderBy?: { occurredAt: 'asc' | 'desc' };
    select?: { occurredAt?: boolean; id?: boolean };
    where?: Record<string, unknown>;
  }): Promise<Partial<CandidateOutboxPersistenceRecord> | null>;
  findMany(args: {
    orderBy?: { occurredAt: 'asc' | 'desc' };
    select?: { id?: boolean };
    take?: number;
    where?: Record<string, unknown>;
  }): Promise<CandidateOutboxPersistenceRecord[]>;
  findUnique(args: {
    where: { id: string };
  }): Promise<CandidateOutboxPersistenceRecord | null>;
  update(args: {
    data: Partial<CandidateOutboxPersistenceRecord>;
    where: { id: string };
  }): Promise<CandidateOutboxPersistenceRecord>;
  updateMany(args: {
    data: Partial<CandidateOutboxPersistenceRecord>;
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type CandidatePrismaRepositoryClient = {
  candidateProfile: CandidateProfileModelDelegate;
  outbox: CandidateOutboxModelDelegate;
};

export type CandidatePrismaClient = PrismaClientLike & {
  $transaction<T>(
    fn: (client: CandidatePrismaRepositoryClient) => Promise<T>
  ): Promise<T>;
  candidateProfile: CandidateProfileModelDelegate;
  outbox: CandidateOutboxModelDelegate;
};
