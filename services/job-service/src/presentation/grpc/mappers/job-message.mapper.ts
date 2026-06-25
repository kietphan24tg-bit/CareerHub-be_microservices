import type { JobMessage } from '@careerhub/contracts';
import type { JobRecord } from '../../../application';

export function toGrpcJobMessage(job: JobRecord): JobMessage {
  const nullFields: string[] = [];

  const collectNullable = (fieldName: string, value: string | number | null) => {
    if (value === null) {
      nullFields.push(fieldName);
    }
  };

  collectNullable('description', job.description);
  collectNullable('employment_type', job.employmentType);
  collectNullable('level', job.level);
  collectNullable('category', job.category);
  collectNullable('department_id', job.departmentId);
  collectNullable('city', job.city);
  collectNullable('country', job.country);
  collectNullable('currency', job.currency);
  collectNullable('expires_at', job.expiresAt?.toISOString() ?? null);
  collectNullable('salary_min', job.salaryMin);
  collectNullable('salary_max', job.salaryMax);

  return {
    application_count: job.applicationCount,
    benefits: job.benefits,
    category: job.category ?? '',
    city: job.city ?? '',
    company: {
      company_name: job.companyName,
      id: job.companyId,
      industry: job.companyIndustry ?? '',
      logo_url: job.companyLogoUrl ?? '',
      website: job.companyWebsite ?? ''
    },
    company_id: job.companyId,
    country: job.country ?? '',
    created_at: job.createdAt.toISOString(),
    currency: job.currency ?? '',
    department_id: job.departmentId ?? '',
    description: job.description ?? '',
    employment_type: job.employmentType ?? '',
    experience_level: job.experienceLevel,
    expires_at: job.expiresAt?.toISOString() ?? '',
    id: job.id,
    is_remote: job.isRemote,
    level: job.level ?? '',
    null_fields: nullFields,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    salary_max: job.salaryMax ?? 0,
    salary_min: job.salaryMin ?? 0,
    saturday_policy: job.saturdayPolicy,
    slug: job.slug,
    status: job.status,
    title: job.title,
    updated_at: job.updatedAt.toISOString()
  } as unknown as JobMessage;
}
