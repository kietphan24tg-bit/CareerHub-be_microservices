import type { PrismaClientLike } from '@careerhub/infrastructure';

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
  expiresAt: Date | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  requirementsJson: string | null;
  responsibilitiesJson: string | null;
  salaryMax: unknown;
  salaryMin: unknown;
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
  expiresAt: Date | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  requirementsJson: string | null;
  responsibilitiesJson: string | null;
  salaryMax: number | null;
  salaryMin: number | null;
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
};
