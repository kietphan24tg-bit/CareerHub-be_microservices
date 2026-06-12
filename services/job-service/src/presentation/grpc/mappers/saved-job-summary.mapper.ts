import type { SavedJobSummary } from '@careerhub/contracts';
import type { JobRecord } from '../../../application';

export function toGrpcSavedJobSummary(job: JobRecord): SavedJobSummary {
  const nullFields: string[] = [];

  const collectNullable = (fieldName: string, value: string | number | null) => {
    if (value === null) {
      nullFields.push(fieldName);
    }
  };

  collectNullable('city', job.city);
  collectNullable('country', job.country);
  collectNullable('currency', job.currency);
  collectNullable('expires_at', job.expiresAt?.toISOString() ?? null);
  collectNullable('salary_min', job.salaryMin);
  collectNullable('salary_max', job.salaryMax);
  collectNullable('company_logo_url', job.companyLogoUrl);
  collectNullable('employment_type', job.employmentType);
  collectNullable('level', job.level);

  return {
    city: job.city ?? '',
    company_id: job.companyId,
    company_logo_url: job.companyLogoUrl ?? '',
    company_name: job.companyName,
    country: job.country ?? '',
    currency: job.currency ?? '',
    employment_type: job.employmentType ?? '',
    expires_at: job.expiresAt?.toISOString() ?? '',
    id: job.id,
    is_remote: job.isRemote,
    level: job.level ?? '',
    null_fields: nullFields,
    salary_max: job.salaryMax ?? 0,
    salary_min: job.salaryMin ?? 0,
    slug: job.slug,
    status: job.status,
    title: job.title
  } as unknown as SavedJobSummary;
}