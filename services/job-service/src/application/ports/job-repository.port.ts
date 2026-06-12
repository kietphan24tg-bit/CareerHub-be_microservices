export type JobStatus = 'draft' | 'published' | 'closed' | 'archived';

export type JobRecord = {
  applicationCount: number;
  benefits: string[];
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
  requirements: string[];
  responsibilities: string[];
  salaryMax: number | null;
  salaryMin: number | null;
  slug: string;
  status: JobStatus;
  title: string;
  updatedAt: Date;
};

export type ListPublicJobsFilter = {
  category?: string;
  companyIndustry?: string;
  employmentType?: string;
  keyword?: string;
  location?: string;
  page: number;
  pageSize: number;
  remoteOnly?: boolean;
  salaryMax?: number;
  salaryMin?: number;
  sort?: 'newest' | 'salary_asc' | 'salary_desc';
};

export type ListEmployerJobsFilter = {
  employerIdentityId: string;
  page: number;
  pageSize: number;
  status?: JobStatus;
};

export type CreateJobData = {
  benefits: string[];
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
  requirements: string[];
  responsibilities: string[];
  salaryMax: number | null;
  salaryMin: number | null;
  slug: string;
  title: string;
};

export type UpdateJobPatch = {
  benefits?: string[] | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  description?: string | null;
  employmentType?: string | null;
  expiresAt?: Date | null;
  isRemote?: boolean;
  level?: string | null;
  requirements?: string[] | null;
  responsibilities?: string[] | null;
  salaryMax?: number | null;
  salaryMin?: number | null;
  slug?: string;
  title?: string;
};

export interface JobRepository {
  create(data: CreateJobData): Promise<JobRecord>;
  existsById(jobId: string): Promise<boolean>;
  findById(jobId: string): Promise<JobRecord | null>;
  findByIdAndEmployer(
    jobId: string,
    employerIdentityId: string
  ): Promise<JobRecord | null>;
  findByIds(jobIds: string[]): Promise<JobRecord[]>;
  findPublicBySlug(slug: string): Promise<JobRecord | null>;
  getStatus(
    jobId: string,
    employerIdentityId: string
  ): Promise<{ status: JobStatus } | null>;
  listEmployer(
    filter: ListEmployerJobsFilter
  ): Promise<{ items: JobRecord[]; total: number }>;
  listPublic(
    filter: ListPublicJobsFilter
  ): Promise<{ items: JobRecord[]; total: number }>;
  slugExists(slug: string, excludeJobId?: string): Promise<boolean>;
  transitionStatus(
    jobId: string,
    employerIdentityId: string,
    nextStatus: JobStatus,
    allowedStatuses: JobStatus[]
  ): Promise<JobRecord | null>;
  update(
    jobId: string,
    employerIdentityId: string,
    patch: UpdateJobPatch
  ): Promise<JobRecord | null>;
}
