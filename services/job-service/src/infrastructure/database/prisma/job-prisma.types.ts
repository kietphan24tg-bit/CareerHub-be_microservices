import type { PrismaClientLike } from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';

export type JobPersistenceRecord = {
  benefitsJson: string | null;
  category: string | null;
  city: string | null;
  companyId: string;
  companyIndustry: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  companyWebsite: string | null;
  country: string | null;
  createdAt: Date;
  currency: string | null;
  description: string | null;
  employerIdentityId: string;
  employmentType: string | null;
  experienceLevel: string;
  expiresAt: Date | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  requirementsJson: string | null;
  responsibilitiesJson: string | null;
  salaryMax: unknown;
  salaryMin: unknown;
  saturdayPolicy: string;
  slug: string;
  status: string;
  title: string;
  updatedAt: Date;
};

export type JobCreateInput = {
  benefitsJson: string | null;
  category: string | null;
  city: string | null;
  companyId: string;
  companyIndustry: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  companyWebsite: string | null;
  country: string | null;
  currency: string | null;
  description: string | null;
  employerIdentityId: string;
  employmentType: string | null;
  experienceLevel: string;
  expiresAt: Date | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  requirementsJson: string | null;
  responsibilitiesJson: string | null;
  salaryMax: number | null;
  salaryMin: number | null;
  saturdayPolicy: string;
  slug: string;
  status: string;
  title: string;
};

export type JobUpdateInput = Partial<
  Omit<JobCreateInput, 'id' | 'employerIdentityId' | 'companyId' | 'status'>
>;

export type JobWhereInput = Record<string, unknown>;
export type JobOrderByInput =
  | Record<string, 'asc' | 'desc'>
  | Array<Record<string, 'asc' | 'desc'>>;

export type OutboxPersistenceRecord = {
  eventName: string;
  id: string;
  lastError: string | null;
  nextRetryAt: Date | null;
  occurredAt: Date;
  payload: OutboxRecord['payload'];
  processedAt: Date | null;
  processingAt: Date | null;
  retryCount: number;
  status: OutboxRecord['status'];
};

export type OutboxModelDelegate = {
  count(args: { where?: Record<string, unknown> }): Promise<number>;
  create(args: { data: Omit<OutboxPersistenceRecord, never> }): Promise<OutboxPersistenceRecord>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  findFirst(args: {
    orderBy?: Record<string, 'asc' | 'desc'>;
    select?: Record<string, boolean>;
    where?: Record<string, unknown>;
  }): Promise<OutboxPersistenceRecord | null>;
  findMany(args: {
    orderBy?: Record<string, 'asc' | 'desc'>;
    select?: Record<string, boolean>;
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
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type JobModelDelegate = {
  count(args: { where?: JobWhereInput }): Promise<number>;
  create(args: { data: JobCreateInput }): Promise<JobPersistenceRecord>;
  findFirst(args: {
    where?: JobWhereInput;
    orderBy?: JobOrderByInput;
    skip?: number;
    take?: number;
  }): Promise<JobPersistenceRecord | null>;
  findMany(args: {
    where?: JobWhereInput;
    orderBy?: JobOrderByInput | JobWhereInput[];
    skip?: number;
    take?: number;
  }): Promise<JobPersistenceRecord[]>;
  findUnique(args: {
    where: { id: string } | { slug: string };
  }): Promise<JobPersistenceRecord | null>;
  update(args: {
    data: JobUpdateInput & { status?: string; updatedAt?: Date };
    where: { id: string };
  }): Promise<JobPersistenceRecord>;
  updateMany(args: {
    data: { status?: string; updatedAt?: Date };
    where?: JobWhereInput;
  }): Promise<{ count: number }>;
};

export type JobPrismaClient = PrismaClientLike & {
  job: JobModelDelegate;
  outbox: OutboxModelDelegate;
};
