import type { JobMessage, PageMeta, SavedJobSummary } from '@careerhub/contracts';
import type { GatewayJobSummary } from '../../saved-jobs/ports/job-lookup.port';

export type GatewayHttpJob = {
  applicationCount?: number;
  benefits: string[];
  category: string | null;
  city: string | null;
  company?: {
    companyName: string;
    id: string;
    industry: string | null;
    logoUrl: string | null;
    website: string | null;
  };
  companyId: string;
  country: string | null;
  createdAt: string;
  currency: string | null;
  description: string | null;
  employmentType: string | null;
  experienceLevel: string;
  expiresAt: string | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  requirements: string[];
  responsibilities: string[];
  salaryMax: number | null;
  salaryMin: number | null;
  saturdayPolicy: string;
  slug: string;
  status: string;
  title: string;
  updatedAt: string;
};

function nullableString(value: string | undefined, nullFields?: string[], field?: string) {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === '') {
    return null;
  }

  return value;
}

function nullableNumber(
  value: number | undefined,
  nullFields?: string[],
  field?: string
): number | null {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === 0) {
    return null;
  }

  return value;
}

export function toGatewayHttpJob(job: JobMessage): GatewayHttpJob {
  const nullFields = job.null_fields ?? [];

  return {
    applicationCount: job.application_count,
    benefits: job.benefits ?? [],
    category: nullableString(job.category, nullFields, 'category'),
    city: nullableString(job.city, nullFields, 'city'),
    company: job.company
      ? {
          companyName: job.company.company_name,
          id: job.company.id,
          industry: nullableString(job.company.industry, nullFields, 'industry'),
          logoUrl: nullableString(job.company.logo_url, nullFields, 'logo_url'),
          website: nullableString(job.company.website, nullFields, 'website')
        }
      : undefined,
    companyId: job.company_id,
    country: nullableString(job.country, nullFields, 'country'),
    createdAt: job.created_at,
    currency: nullableString(job.currency, nullFields, 'currency'),
    description: nullableString(job.description, nullFields, 'description'),
    employmentType: nullableString(job.employment_type, nullFields, 'employment_type'),
    experienceLevel: job.experience_level || 'unspecified',
    expiresAt: nullableString(job.expires_at, nullFields, 'expires_at'),
    id: job.id,
    isRemote: job.is_remote,
    level: nullableString(job.level, nullFields, 'level'),
    requirements: job.requirements ?? [],
    responsibilities: job.responsibilities ?? [],
    salaryMax: nullableNumber(job.salary_max, nullFields, 'salary_max'),
    salaryMin: nullableNumber(job.salary_min, nullFields, 'salary_min'),
    saturdayPolicy: job.saturday_policy || 'unspecified',
    slug: job.slug,
    status: job.status,
    title: job.title,
    updatedAt: job.updated_at
  };
}

export function toGatewayHttpPageMeta(meta: PageMeta) {
  return {
    page: meta.page,
    pageSize: meta.page_size,
    total: meta.total
  };
}

export function toGatewayJobSummary(job: SavedJobSummary): GatewayJobSummary {
  const nullFields = job.null_fields ?? [];

  return {
    city: nullableString(job.city, nullFields, 'city'),
    companyLogoUrl: nullableString(job.company_logo_url, nullFields, 'company_logo_url'),
    companyName: job.company_name,
    country: nullableString(job.country, nullFields, 'country'),
    currency: nullableString(job.currency, nullFields, 'currency'),
    employmentType: nullableString(job.employment_type, nullFields, 'employment_type'),
    expiresAt: nullableString(job.expires_at, nullFields, 'expires_at'),
    id: job.id,
    isRemote: job.is_remote,
    level: nullableString(job.level, nullFields, 'level'),
    salaryMax: nullableNumber(job.salary_max, nullFields, 'salary_max'),
    salaryMin: nullableNumber(job.salary_min, nullFields, 'salary_min'),
    slug: job.slug,
    status: job.status,
    title: job.title
  };
}
