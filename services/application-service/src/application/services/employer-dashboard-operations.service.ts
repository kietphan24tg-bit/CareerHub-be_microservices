import type { ApplicationRepository } from '../ports/application-repository.port';
import type { RecruitmentRepository } from '../ports/recruitment-repository.port';
import type { EmployerDashboardRecruitmentData } from '../ports/employer-dashboard.port';
import {
  DASHBOARD_ACTIVE_INTERVIEW_STATUSES,
  DASHBOARD_ACTIVITY_LIMIT,
  DASHBOARD_PIPELINE_LIMIT,
  DASHBOARD_TODAY_INTERVIEW_LIMIT
} from './employer-dashboard.constants';

export class EmployerDashboardOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly recruitmentRepository: RecruitmentRepository
  ) {}

  async getRecruitmentData(
    employerIdentityId: string,
    localDate: string
  ): Promise<EmployerDashboardRecruitmentData> {
    const normalizedEmployerId = employerIdentityId.trim();
    const normalizedDate = localDate.trim();
    const activeStatuses = [...DASHBOARD_ACTIVE_INTERVIEW_STATUSES];

    const [
      totalApplicants,
      offersOpen,
      interviewsTodayCount,
      pipeline,
      interviewsToday,
      recentActivities
    ] = await Promise.all([
      this.applicationRepository.countByEmployer(normalizedEmployerId),
      this.recruitmentRepository.countOpenOffersByEmployer(normalizedEmployerId),
      this.recruitmentRepository.countEmployerInterviewsForDate(
        normalizedEmployerId,
        normalizedDate,
        activeStatuses
      ),
      this.applicationRepository.listEmployerDashboardPipeline(
        normalizedEmployerId,
        DASHBOARD_PIPELINE_LIMIT
      ),
      this.recruitmentRepository.listEmployerInterviewsForDate(
        normalizedEmployerId,
        normalizedDate,
        activeStatuses,
        DASHBOARD_TODAY_INTERVIEW_LIMIT
      ),
      this.applicationRepository.listEmployerDashboardRecentActivities(
        normalizedEmployerId,
        DASHBOARD_ACTIVITY_LIMIT
      )
    ]);

    return {
      interviewsToday: interviewsToday.map((interview) => ({
        applicationId: interview.applicationId,
        candidateIdentityId: interview.candidateIdentityId,
        date: interview.date,
        id: interview.id,
        jobId: interview.jobId,
        startTime: interview.startTime,
        status: interview.status,
        type: interview.type
      })),
      pipeline,
      recentActivities,
      summary: {
        interviewsToday: interviewsTodayCount,
        offersOpen,
        totalApplicants
      }
    };
  }
}
