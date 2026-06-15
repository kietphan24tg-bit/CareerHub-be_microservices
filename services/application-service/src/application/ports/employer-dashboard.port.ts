import type { ApplicationStatus } from './application-repository.port';

export type EmployerDashboardPipelineRecord = {
  applicationId: string;
  appliedAt: Date;
  candidateIdentityId: string;
  jobId: string;
  status: ApplicationStatus;
  updatedAt: Date;
};

export type EmployerDashboardActivityRecord = {
  applicationId: string;
  candidateIdentityId: string;
  createdAt: Date;
  eventType: string;
  id: string;
  jobId: string;
  newStatus: string | null;
  note: string | null;
  oldStatus: string | null;
};

export type EmployerDashboardRecruitmentData = {
  interviewsToday: Array<{
    applicationId: string;
    candidateIdentityId: string;
    date: string | null;
    id: string;
    jobId: string;
    startTime: string | null;
    status: string;
    type: string;
  }>;
  pipeline: EmployerDashboardPipelineRecord[];
  recentActivities: EmployerDashboardActivityRecord[];
  summary: {
    interviewsToday: number;
    offersOpen: number;
    totalApplicants: number;
  };
};

export type RecruiterNoteRecord = {
  applicationId: string;
  authorIdentityId: string;
  body: string;
  createdAt: Date;
  id: string;
  updatedAt: Date;
};

export type CreateRecruiterNoteData = {
  applicationId: string;
  authorIdentityId: string;
  body: string;
  id: string;
};
