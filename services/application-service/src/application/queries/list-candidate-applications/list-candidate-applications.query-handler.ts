import { ValidationError } from '@careerhub/shared-kernel';
import type {
  ApplicationRecord,
  ApplicationRepository,
  ApplicationStatus,
  CandidateApplicationStatusCount
} from '../../ports';
import type {
  CandidateApplicationStatusFilter,
  ListCandidateApplicationsQuery
} from './list-candidate-applications.query';

export type CandidateApplicationsSummary = {
  all: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  reviewed: number;
  withdrawn: number;
};

export type ListCandidateApplicationsResult = {
  items: ApplicationRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
  summary: CandidateApplicationsSummary;
};

function resolveCandidateStatuses(
  status: CandidateApplicationStatusFilter
): ApplicationStatus[] | undefined {
  if (status === 'all') {
    return undefined;
  }

  if (status === 'reviewed') {
    return ['reviewed', 'shortlisted'];
  }

  return [status];
}

function mapCandidateApplicationsSummary(
  rows: CandidateApplicationStatusCount[]
): CandidateApplicationsSummary {
  const countMap = new Map(rows.map((row) => [row.status, row.count] as const));

  return {
    all: rows.reduce((sum, row) => sum + row.count, 0),
    applied: countMap.get('applied') ?? 0,
    interview: countMap.get('interview') ?? 0,
    offer: countMap.get('offer') ?? 0,
    rejected: countMap.get('rejected') ?? 0,
    reviewed: (countMap.get('reviewed') ?? 0) + (countMap.get('shortlisted') ?? 0),
    withdrawn: countMap.get('withdrawn') ?? 0
  };
}

export class ListCandidateApplicationsQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(
    query: ListCandidateApplicationsQuery
  ): Promise<ListCandidateApplicationsResult> {
    if (!query.candidateIdentityId.trim()) {
      throw new ValidationError('Candidate identity id is required');
    }

    const page = query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize > 0 ? Math.min(query.pageSize, 50) : 20;
    const sort = query.sort === 'oldest' ? 'oldest' : 'newest';
    const status = query.status ?? 'all';
    const [result, summaryRows] = await Promise.all([
      this.applicationRepository.listCandidate({
        candidateIdentityId: query.candidateIdentityId.trim(),
        page,
        pageSize,
        sort,
        statuses: resolveCandidateStatuses(status)
      }),
      this.applicationRepository.countCandidateByStatus(query.candidateIdentityId.trim())
    ]);

    return {
      items: result.items,
      meta: {
        page,
        pageSize,
        total: result.total
      },
      summary: mapCandidateApplicationsSummary(summaryRows)
    };
  }
}
