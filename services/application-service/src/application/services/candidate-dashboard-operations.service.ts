import type { ApplicationRepository } from '../ports/application-repository.port';
import type { CandidateDashboardData } from '../ports/candidate-dashboard.port';
import type { RecruitmentRepository } from '../ports/recruitment-repository.port';
import {
  CANDIDATE_DASHBOARD_ACTIVE_OFFER_LIMIT,
  CANDIDATE_DASHBOARD_INTERVIEW_LIMIT,
  CANDIDATE_DASHBOARD_OPEN_OFFER_STATUSES,
  CANDIDATE_DASHBOARD_RECENT_APPLICATION_LIMIT,
  DASHBOARD_ACTIVE_INTERVIEW_STATUSES
} from './employer-dashboard.constants';

export class CandidateDashboardOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly recruitmentRepository: RecruitmentRepository
  ) {}

  async getCandidateDashboardData(
    candidateIdentityId: string,
    localDate: string
  ): Promise<CandidateDashboardData> {
    const normalizedCandidateId = candidateIdentityId.trim();
    const normalizedDate = localDate.trim();
    const activeInterviewStatuses = [...DASHBOARD_ACTIVE_INTERVIEW_STATUSES];
    const openOfferStatuses = [...CANDIDATE_DASHBOARD_OPEN_OFFER_STATUSES];

    const [statusCounts, recentApplications, activeInterviews, upcomingInterviews, activeOffers] =
      await Promise.all([
        this.applicationRepository.countCandidateByStatus(normalizedCandidateId),
        this.applicationRepository.listCandidate({
          candidateIdentityId: normalizedCandidateId,
          page: 1,
          pageSize: CANDIDATE_DASHBOARD_RECENT_APPLICATION_LIMIT,
          sort: 'newest'
        }),
        this.recruitmentRepository.countCandidateInterviewsByStatuses(
          normalizedCandidateId,
          normalizedDate,
          activeInterviewStatuses
        ),
        this.recruitmentRepository.listCandidateUpcomingInterviews(
          normalizedCandidateId,
          normalizedDate,
          activeInterviewStatuses,
          CANDIDATE_DASHBOARD_INTERVIEW_LIMIT
        ),
        this.recruitmentRepository.listCandidateActiveOffers(
          normalizedCandidateId,
          openOfferStatuses,
          CANDIDATE_DASHBOARD_ACTIVE_OFFER_LIMIT
        )
      ]);

    return {
      activeOffers: activeOffers.map((offer) => ({
        applicationId: offer.applicationId,
        currency: offer.currency,
        employerIdentityId: offer.employerIdentityId,
        expiresAt: offer.expiresAt,
        id: offer.id,
        jobId: offer.jobId,
        salary: offer.salary,
        sentAt: offer.sentAt,
        status: offer.status,
        title: offer.title
      })),
      recentApplications: recentApplications.items.map((application) => ({
        applicationId: application.id,
        appliedAt: application.createdAt,
        employerIdentityId: application.employerIdentityId,
        jobId: application.jobId,
        status: application.status,
        updatedAt: application.updatedAt
      })),
      summary: {
        activeInterviews,
        activeOffers: activeOffers.length,
        totalApplications: statusCounts.reduce((sum, item) => sum + item.count, 0)
      },
      upcomingInterviews: upcomingInterviews.map((interview) => ({
        applicationId: interview.applicationId,
        date: interview.date,
        employerIdentityId: interview.employerIdentityId,
        id: interview.id,
        jobId: interview.jobId,
        round: interview.round,
        startTime: interview.startTime,
        status: interview.status,
        type: interview.type
      }))
    };
  }
}
