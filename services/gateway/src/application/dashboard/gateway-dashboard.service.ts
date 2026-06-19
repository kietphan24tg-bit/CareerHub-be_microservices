import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { CommunicationGrpcClient } from '../../infrastructure/transport/grpc/communication-grpc.client';
import { EmployerGrpcClient } from '../../infrastructure/transport/grpc/employer-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';

type CandidateSnapshot = {
  avatarUrl: string | null;
  fullName: string | null;
  headline: string | null;
};

function resolveLocalDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveCandidateName(
  profile: CandidateSnapshot | null,
  candidateIdentityId: string
): string {
  const name = profile?.fullName?.trim();
  if (name) {
    return name;
  }

  return `Candidate #${candidateIdentityId}`;
}

@Injectable()
export class GatewayDashboardService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly communicationGrpcClient: CommunicationGrpcClient,
    private readonly employerGrpcClient: EmployerGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient
  ) {}

  async getCandidateDashboard(input: { identityId: string; requestId?: string }) {
    const localDate = resolveLocalDate();
    const [dashboardData, savedJobs, notifications] = await Promise.all([
      this.applicationGrpcClient.getCandidateDashboardData(
        {
          candidate_identity_id: input.identityId,
          local_date: localDate
        },
        input.requestId
      ),
      this.candidateGrpcClient.listSavedJobsByIdentityId(
        { identity_id: input.identityId },
        input.requestId
      ),
      this.communicationGrpcClient.listNotifications(
        { identity_id: input.identityId },
        input.requestId
      )
    ]);

    const jobIds = new Set<string>();

    for (const item of dashboardData.recent_applications ?? []) {
      jobIds.add(item.job_id);
    }

    for (const item of dashboardData.upcoming_interviews ?? []) {
      jobIds.add(item.job_id);
    }

    for (const item of dashboardData.active_offers ?? []) {
      jobIds.add(item.job_id);
    }

    const jobsLookup = await this.loadJobsLookup([...jobIds], input.requestId);

    return {
      activeOffers: (dashboardData.active_offers ?? []).map((offer) => ({
        applicationId: offer.application_id,
        expiresAt: offer.expires_at || null,
        id: offer.id,
        jobId: offer.job_id,
        jobTitle: jobsLookup.get(offer.job_id)?.title ?? 'Job',
        salary: offer.salary,
        sentAt: offer.sent_at || null,
        status: offer.status
      })),
      recentApplications: (dashboardData.recent_applications ?? []).map((application) => ({
        applicationId: application.application_id,
        appliedAt: application.applied_at,
        id: application.application_id,
        jobId: application.job_id,
        jobTitle: jobsLookup.get(application.job_id)?.title ?? 'Job',
        status: application.status,
        updatedAt: application.updated_at
      })),
      summary: {
        activeInterviews: dashboardData.summary?.active_interviews ?? 0,
        activeOffers: dashboardData.summary?.active_offers ?? 0,
        savedJobs: savedJobs.saved_jobs?.length ?? 0,
        totalApplications: dashboardData.summary?.total_applications ?? 0,
        unreadNotifications: notifications.unread_count ?? 0
      },
      upcomingInterviews: (dashboardData.upcoming_interviews ?? []).map((interview) => ({
        applicationId: interview.application_id,
        date: interview.date || null,
        id: interview.id,
        jobId: interview.job_id,
        jobTitle: jobsLookup.get(interview.job_id)?.title ?? 'Job',
        startTime: interview.start_time || null,
        status: interview.status,
        type: interview.type
      }))
    };
  }

  async getEmployerDashboard(input: { identityId: string; requestId?: string }) {
    await this.ensureCompanyProfile(input.identityId, input.requestId);
    const localDate = resolveLocalDate();

    const [recruitmentData, jobsSummary] = await Promise.all([
      this.applicationGrpcClient.getEmployerDashboardRecruitmentData(
        {
          employer_identity_id: input.identityId,
          local_date: localDate
        },
        input.requestId
      ),
      this.jobGrpcClient.getEmployerDashboardJobsSummary(
        { employer_identity_id: input.identityId },
        input.requestId
      )
    ]);

    const candidateIds = new Set<string>();
    const jobIds = new Set<string>();

    for (const item of recruitmentData.pipeline ?? []) {
      candidateIds.add(item.candidate_identity_id);
      jobIds.add(item.job_id);
    }

    for (const item of recruitmentData.interviews_today ?? []) {
      candidateIds.add(item.candidate_identity_id);
      jobIds.add(item.job_id);
    }

    for (const item of recruitmentData.recent_activities ?? []) {
      candidateIds.add(item.candidate_identity_id);
      jobIds.add(item.job_id);
    }

    for (const job of jobsSummary.priority_jobs ?? []) {
      jobIds.add(job.id);
    }

    const [candidateProfiles, jobsLookup, applicationCounts] = await Promise.all([
      this.loadCandidateProfiles([...candidateIds], input.requestId),
      this.loadJobsLookup([...jobIds], input.requestId),
      this.applicationGrpcClient.getApplicationCountsByJobIds(
        { job_ids: [...jobIds] },
        input.requestId
      )
    ]);
    const countByJobId = new Map(
      (applicationCounts.items ?? []).map((item) => [item.job_id, item.count])
    );

    return {
      interviewsToday: (recruitmentData.interviews_today ?? []).map((interview) => ({
        applicationId: interview.application_id,
        candidateName: resolveCandidateName(
          candidateProfiles.get(interview.candidate_identity_id) ?? null,
          interview.candidate_identity_id
        ),
        date: interview.date || null,
        id: interview.id,
        jobTitle: jobsLookup.get(interview.job_id)?.title ?? 'Job',
        startTime: interview.start_time || null,
        status: interview.status,
        type: interview.type
      })),
      pipeline: (recruitmentData.pipeline ?? []).map((application) => {
        const profile = candidateProfiles.get(application.candidate_identity_id) ?? null;

        return {
          applicationId: application.application_id,
          appliedAt: application.applied_at,
          avatarUrl: profile?.avatarUrl ?? null,
          candidateName: resolveCandidateName(profile, application.candidate_identity_id),
          candidateUserId: application.candidate_identity_id,
          headline: profile?.headline ?? null,
          jobId: application.job_id,
          jobTitle: jobsLookup.get(application.job_id)?.title ?? 'Job',
          score: null,
          stage: application.status,
          updatedAt: application.updated_at
        };
      }),
      priorityJobs: (jobsSummary.priority_jobs ?? []).map((job) => ({
        applicationCount: countByJobId.get(job.id) ?? 0,
        category: job.category || null,
        city: job.city || null,
        country: job.country || null,
        expiresAt: job.expires_at || null,
        id: job.id,
        isRemote: job.is_remote,
        slug: job.slug,
        status: job.status,
        title: job.title
      })),
      recentActivities: (recruitmentData.recent_activities ?? []).map((activity) => ({
        applicationId: activity.application_id,
        candidateName: resolveCandidateName(
          candidateProfiles.get(activity.candidate_identity_id) ?? null,
          activity.candidate_identity_id
        ),
        createdAt: activity.created_at,
        eventType: activity.event_type,
        id: activity.id,
        jobTitle: jobsLookup.get(activity.job_id)?.title ?? 'Job',
        newStatus: activity.new_status || null,
        note: activity.note || null,
        oldStatus: activity.old_status || null
      })),
      summary: {
        activeJobs: jobsSummary.active_jobs ?? 0,
        interviewsToday: recruitmentData.summary?.interviews_today ?? 0,
        offersOpen: recruitmentData.summary?.offers_open ?? 0,
        totalApplicants: recruitmentData.summary?.total_applicants ?? 0
      }
    };
  }

  private async ensureCompanyProfile(identityId: string, requestId?: string) {
    try {
      await this.employerGrpcClient.getEmployerProfileByIdentityId(
        { identity_id: identityId },
        requestId
      );
    } catch (error) {
      if (this.isCompanyProfileNotFoundError(error)) {
        throw new NotFoundException({
          code: 'COMPANY_PROFILE_NOT_FOUND',
          message: 'Company profile not found.'
        });
      }

      throw error;
    }
  }

  private isCompanyProfileNotFoundError(error: unknown): boolean {
    if (!(error instanceof HttpException)) {
      return false;
    }

    const response = error.getResponse();

    if (typeof response === 'object' && response !== null && 'code' in response) {
      return (response as { code: unknown }).code === 'NOT_FOUND';
    }

    return error.getStatus() === 404;
  }

  private async loadCandidateProfiles(candidateIds: string[], requestId?: string) {
    const lookup = new Map<string, CandidateSnapshot>();

    await Promise.all(
      candidateIds.map(async (candidateId) => {
        lookup.set(candidateId, await this.loadCandidateProfile(candidateId, requestId));
      })
    );

    return lookup;
  }

  private async loadCandidateProfile(
    identityId: string,
    requestId?: string
  ): Promise<CandidateSnapshot> {
    try {
      const response = await this.candidateGrpcClient.getCandidateProfileByIdentityId(
        { identity_id: identityId },
        requestId
      );
      const nullFields = new Set(response.profile.null_fields ?? []);

      return {
        avatarUrl: nullFields.has('avatar_url') ? null : response.profile.avatar_url || null,
        fullName: response.profile.full_name,
        headline: nullFields.has('headline') ? null : response.profile.headline || null
      };
    } catch {
      return {
        avatarUrl: null,
        fullName: null,
        headline: null
      };
    }
  }

  private async loadJobsLookup(jobIds: string[], requestId?: string) {
    const lookup = new Map<string, { title: string }>();

    if (jobIds.length === 0) {
      return lookup;
    }

    const response = await this.jobGrpcClient.listJobsByIds(
      { job_ids: jobIds },
      requestId
    );

    for (const job of response.items ?? []) {
      lookup.set(job.id, { title: job.title });
    }

    return lookup;
  }
}
