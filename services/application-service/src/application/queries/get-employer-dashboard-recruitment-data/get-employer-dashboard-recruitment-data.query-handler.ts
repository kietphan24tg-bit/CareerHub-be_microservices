import { EmployerDashboardOperations } from '../../services/employer-dashboard-operations.service';
import type { EmployerDashboardCache } from '../../ports/employer-dashboard-cache.port';
import type { EmployerDashboardRecruitmentData } from '../../ports/employer-dashboard.port';
import type { GetEmployerDashboardRecruitmentDataQuery } from './get-employer-dashboard-recruitment-data.query';

export class GetEmployerDashboardRecruitmentDataQueryHandler {
  constructor(
    private readonly employerDashboardOperations: EmployerDashboardOperations,
    private readonly dashboardCache?: EmployerDashboardCache
  ) {}

  async execute(
    query: GetEmployerDashboardRecruitmentDataQuery
  ): Promise<EmployerDashboardRecruitmentData> {
    const { employerIdentityId, localDate } = query;

    if (this.dashboardCache) {
      const cached = await this.dashboardCache
        .get(employerIdentityId, localDate)
        .catch(() => null);
      if (cached) return cached;
    }

    const result = await this.employerDashboardOperations.getRecruitmentData(
      employerIdentityId,
      localDate
    );

    if (this.dashboardCache) {
      await this.dashboardCache
        .set(employerIdentityId, localDate, result)
        .catch(() => undefined);
    }

    return result;
  }
}
