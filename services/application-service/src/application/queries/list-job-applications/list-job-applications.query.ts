import type { ApplicationStatus } from '../../ports';

export type ListJobApplicationsQuery = {
  employerIdentityId: string;
  jobId: string;
  page: number;
  pageSize: number;
  status?: ApplicationStatus;
};
