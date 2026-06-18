import type { EmployerDashboardRecruitmentData } from './employer-dashboard.port';

export interface EmployerDashboardCache {
  get(
    employerIdentityId: string,
    localDate: string
  ): Promise<EmployerDashboardRecruitmentData | null>;
  set(
    employerIdentityId: string,
    localDate: string,
    data: EmployerDashboardRecruitmentData
  ): Promise<void>;
  invalidate(employerIdentityId: string): Promise<void>;
}
