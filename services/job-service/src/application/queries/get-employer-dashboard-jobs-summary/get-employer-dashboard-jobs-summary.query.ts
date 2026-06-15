export const DASHBOARD_PRIORITY_JOB_LIMIT = 5;

export type GetEmployerDashboardJobsSummaryQuery = {
  employerIdentityId: string;
};

export type EmployerDashboardJobsSummary = {
  activeJobs: number;
  priorityJobs: Array<{
    category: string | null;
    city: string | null;
    country: string | null;
    expiresAt: Date | null;
    id: string;
    isRemote: boolean;
    slug: string;
    status: string;
    title: string;
  }>;
};
