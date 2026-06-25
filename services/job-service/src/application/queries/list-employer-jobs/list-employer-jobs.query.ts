import type { JobStatus } from '../../ports';

export type ListEmployerJobsQuery = {
  category?: string;
  departmentId?: string;
  employerIdentityId: string;
  page: number;
  pageSize: number;
  status?: JobStatus;
};
