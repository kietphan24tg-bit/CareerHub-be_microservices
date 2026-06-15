import { EmployerDashboardOperations } from '../../services/employer-dashboard-operations.service';
import type { GetEmployerDashboardRecruitmentDataQuery } from './get-employer-dashboard-recruitment-data.query';

export class GetEmployerDashboardRecruitmentDataQueryHandler {
  constructor(private readonly employerDashboardOperations: EmployerDashboardOperations) {}

  execute(query: GetEmployerDashboardRecruitmentDataQuery) {
    return this.employerDashboardOperations.getRecruitmentData(
      query.employerIdentityId,
      query.localDate
    );
  }
}
