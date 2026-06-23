import type { ListPublicJobsRequest } from '@careerhub/contracts';

export function resolveListPublicJobsSalaryFilter(request: ListPublicJobsRequest): {
  salaryMax?: number;
  salaryMin?: number;
} {
  const salaryMin = request.salary_min;
  const salaryMax = request.salary_max;

  // Proto3 defaults unset doubles to 0. Treat non-positive values as "not provided"
  // so list queries without salary filters are not narrowed to salaryMin <= 0.
  return {
    ...(salaryMin !== undefined && salaryMin > 0 ? { salaryMin } : {}),
    ...(salaryMax !== undefined && salaryMax > 0 ? { salaryMax } : {})
  };
}
