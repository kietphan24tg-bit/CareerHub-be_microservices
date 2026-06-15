import type { JobRepository } from '../../ports/job-repository.port';
import {
  DASHBOARD_PRIORITY_JOB_LIMIT,
  type EmployerDashboardJobsSummary,
  type GetEmployerDashboardJobsSummaryQuery
} from './get-employer-dashboard-jobs-summary.query';

export class GetEmployerDashboardJobsSummaryQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(
    query: GetEmployerDashboardJobsSummaryQuery
  ): Promise<EmployerDashboardJobsSummary> {
    const employerIdentityId = query.employerIdentityId.trim();
    const [activeJobs, priorityJobs] = await Promise.all([
      this.jobRepository.countPublishedByEmployer(employerIdentityId),
      this.jobRepository.listEmployerDashboardPriorityJobs(
        employerIdentityId,
        DASHBOARD_PRIORITY_JOB_LIMIT
      )
    ]);

    return {
      activeJobs,
      priorityJobs: priorityJobs.map((job) => ({
        category: job.category,
        city: job.city,
        country: job.country,
        expiresAt: job.expiresAt,
        id: job.id,
        isRemote: job.isRemote,
        slug: job.slug,
        status: job.status,
        title: job.title
      }))
    };
  }
}
