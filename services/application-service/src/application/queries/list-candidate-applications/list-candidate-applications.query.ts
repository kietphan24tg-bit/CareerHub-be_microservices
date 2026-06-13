import type { ApplicationStatus } from '../../ports';

export type CandidateApplicationStatusFilter = 'all' | ApplicationStatus;

export type ListCandidateApplicationsQuery = {
  candidateIdentityId: string;
  page: number;
  pageSize: number;
  sort?: 'newest' | 'oldest';
  status?: CandidateApplicationStatusFilter;
};
