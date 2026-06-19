import { CandidateDashboardOperations } from '../../services/candidate-dashboard-operations.service';
import type { CandidateDashboardData } from '../../ports/candidate-dashboard.port';
import type { GetCandidateDashboardDataQuery } from './get-candidate-dashboard-data.query';

export class GetCandidateDashboardDataQueryHandler {
  constructor(
    private readonly candidateDashboardOperations: CandidateDashboardOperations
  ) {}

  async execute(
    query: GetCandidateDashboardDataQuery
  ): Promise<CandidateDashboardData> {
    return this.candidateDashboardOperations.getCandidateDashboardData(
      query.candidateIdentityId,
      query.localDate
    );
  }
}
