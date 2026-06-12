import type { JobStatus } from '../../ports';

export type ListEmployerJobsQuery = {
  employerIdentityId: string;
  page: number;
  pageSize: number;
  status?: JobStatus;
};
