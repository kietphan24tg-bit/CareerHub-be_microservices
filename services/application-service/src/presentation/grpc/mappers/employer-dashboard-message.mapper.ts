import type {
  EmployerDashboardInterviewTodayItemMessage,
  EmployerDashboardPipelineItemMessage,
  EmployerDashboardRecentActivityItemMessage,
  EmployerDashboardRecruitmentSummaryMessage,
  GetEmployerDashboardRecruitmentDataResponse,
  RecruiterNoteMessage
} from '@careerhub/contracts';
import type {
  EmployerDashboardRecruitmentData,
  RecruiterNoteRecord
} from '../../../application/ports/employer-dashboard.port';

export function toGrpcEmployerDashboardRecruitmentDataResponse(
  data: EmployerDashboardRecruitmentData
): GetEmployerDashboardRecruitmentDataResponse {
  return {
    interviews_today: data.interviewsToday.map(toGrpcInterviewTodayItem),
    pipeline: data.pipeline.map(toGrpcPipelineItem),
    recent_activities: data.recentActivities.map(toGrpcRecentActivityItem),
    summary: toGrpcRecruitmentSummary(data.summary)
  };
}

function toGrpcRecruitmentSummary(
  summary: EmployerDashboardRecruitmentData['summary']
): EmployerDashboardRecruitmentSummaryMessage {
  return {
    interviews_today: summary.interviewsToday,
    offers_open: summary.offersOpen,
    total_applicants: summary.totalApplicants
  };
}

function toGrpcPipelineItem(
  item: EmployerDashboardRecruitmentData['pipeline'][number]
): EmployerDashboardPipelineItemMessage {
  return {
    application_id: item.applicationId,
    applied_at: item.appliedAt.toISOString(),
    candidate_identity_id: item.candidateIdentityId,
    job_id: item.jobId,
    status: item.status,
    updated_at: item.updatedAt.toISOString()
  };
}

function toGrpcInterviewTodayItem(
  item: EmployerDashboardRecruitmentData['interviewsToday'][number]
): EmployerDashboardInterviewTodayItemMessage {
  return {
    application_id: item.applicationId,
    candidate_identity_id: item.candidateIdentityId,
    date: item.date ?? '',
    id: item.id,
    job_id: item.jobId,
    start_time: item.startTime ?? '',
    status: item.status,
    type: item.type
  };
}

function toGrpcRecentActivityItem(
  item: EmployerDashboardRecruitmentData['recentActivities'][number]
): EmployerDashboardRecentActivityItemMessage {
  return {
    application_id: item.applicationId,
    candidate_identity_id: item.candidateIdentityId,
    created_at: item.createdAt.toISOString(),
    event_type: item.eventType,
    id: item.id,
    job_id: item.jobId,
    new_status: item.newStatus ?? '',
    note: item.note ?? '',
    old_status: item.oldStatus ?? ''
  };
}

export function toGrpcRecruiterNoteMessage(note: RecruiterNoteRecord): RecruiterNoteMessage {
  return {
    application_id: note.applicationId,
    author_identity_id: note.authorIdentityId,
    body: note.body,
    created_at: note.createdAt.toISOString(),
    id: note.id,
    updated_at: note.updatedAt.toISOString()
  };
}
