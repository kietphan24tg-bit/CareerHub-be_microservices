export type UpdateJobCommand = {
  benefits?: string[];
  category?: string | null;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  description?: string | null;
  employerIdentityId: string;
  employmentType?: string | null;
  expiresAt?: string | null;
  isRemote?: boolean;
  jobId: string;
  level?: string | null;
  requirements?: string[];
  responsibilities?: string[];
  salaryMax?: number;
  salaryMin?: number;
  title?: string;
};
