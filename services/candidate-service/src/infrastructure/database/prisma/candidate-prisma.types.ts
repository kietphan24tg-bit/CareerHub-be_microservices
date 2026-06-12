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
  resumeId: string | null;
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
  deleteMany(args: {
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
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

export type SavedJobPersistenceRecord = {
  createdAt: Date;
  id: string;
  identityId: string;
  jobId: string;
};

export type SavedJobCreateInput = {
  createdAt?: Date;
  id: string;
  identityId: string;
  jobId: string;
};

export type SavedJobModelDelegate = {
  create(args: { data: SavedJobCreateInput }): Promise<SavedJobPersistenceRecord>;
  deleteMany(args: {
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
  findMany(args: {
    orderBy?: { createdAt: 'asc' | 'desc' };
    where?: Record<string, unknown>;
  }): Promise<SavedJobPersistenceRecord[]>;
  findUnique(args: {
    where: { identityId_jobId: { identityId: string; jobId: string } };
  }): Promise<SavedJobPersistenceRecord | null>;
};

export type ResumeTemplatePersistenceRecord = {
  category: string | null;
  createdAt: Date;
  id: string;
  isActive: boolean;
  layoutData: unknown;
  name: string;
  thumbnail: string | null;
};

export type ResumePersistenceRecord = {
  content: unknown;
  createdAt: Date;
  id: string;
  identityId: string;
  isUsing: boolean;
  templateId: string | null;
  title: string;
  updatedAt: Date;
};

export type ResumeCreateInput = {
  content: unknown;
  id: string;
  identityId: string;
  isUsing?: boolean;
  templateId: string | null;
  title: string;
};

export type ResumeTemplateModelDelegate = {
  findFirst(args: {
    where?: Record<string, unknown>;
  }): Promise<ResumeTemplatePersistenceRecord | null>;
  findMany(args: {
    orderBy?: Record<string, 'asc' | 'desc'>;
    select?: Record<string, boolean>;
    where?: Record<string, unknown>;
  }): Promise<ResumeTemplatePersistenceRecord[] | Array<Partial<ResumeTemplatePersistenceRecord>>>;
};

export type ResumeModelDelegate = {
  create(args: { data: ResumeCreateInput }): Promise<ResumePersistenceRecord>;
  deleteMany(args: { where?: Record<string, unknown> }): Promise<{ count: number }>;
  findFirst(args: {
    orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    where?: Record<string, unknown>;
  }): Promise<ResumePersistenceRecord | null>;
  findMany(args: {
    orderBy?: Array<Record<string, 'asc' | 'desc'>>;
    where?: Record<string, unknown>;
  }): Promise<ResumePersistenceRecord[]>;
  findUnique(args: {
    where: { id: string };
  }): Promise<ResumePersistenceRecord | null>;
  update(args: {
    data: Partial<ResumePersistenceRecord>;
    where: { id: string };
  }): Promise<ResumePersistenceRecord>;
  updateMany(args: {
    data: Partial<ResumePersistenceRecord>;
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type CandidatePrismaRepositoryClient = {
  candidateProfile: CandidateProfileModelDelegate;
  outbox: CandidateOutboxModelDelegate;
  resume: ResumeModelDelegate;
  resumeTemplate: ResumeTemplateModelDelegate;
  savedJob: SavedJobModelDelegate;
};

export type CandidatePrismaClient = PrismaClientLike & {
  $transaction<T>(
    fn: (client: CandidatePrismaRepositoryClient) => Promise<T>
  ): Promise<T>;
  candidateProfile: CandidateProfileModelDelegate;
  outbox: CandidateOutboxModelDelegate;
  resume: ResumeModelDelegate;
  resumeTemplate: ResumeTemplateModelDelegate;
  savedJob: SavedJobModelDelegate;
};
