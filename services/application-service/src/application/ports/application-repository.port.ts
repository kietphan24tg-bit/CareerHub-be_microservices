export const APPLICATION_STATUS_VALUES = [
  'applied',
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number];

export type ApplicationHistoryActorType = 'candidate' | 'employer' | 'system';

export type ApplicationRecord = {
  candidateIdentityId: string;
  coverLetter: string | null;
  createdAt: Date;
  employerIdentityId: string;
  id: string;
  jobId: string;
  resumeId: string;
  status: ApplicationStatus;
  updatedAt: Date;
};

import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord
} from './recruitment-repository.port';

export type ApplicationHistoryRecord = {
  actorIdentityId: string | null;
  actorType: ApplicationHistoryActorType;
  applicationId: string;
  createdAt: Date;
  eventType: string;
  fromStatus: ApplicationStatus | null;
  id: string;
  note: string | null;
  toStatus: ApplicationStatus;
};

export type { ApplicationInterviewRecord, ApplicationOfferRecord };

export type CreateApplicationData = {
  candidateIdentityId: string;
  coverLetter: string | null;
  employerIdentityId: string;
  id: string;
  jobId: string;
  resumeId: string;
  status: ApplicationStatus;
};

export type CreateApplicationHistoryData = {
  actorIdentityId: string | null;
  actorType: ApplicationHistoryActorType;
  applicationId: string;
  eventType: string;
  fromStatus: ApplicationStatus | null;
  id: string;
  note: string | null;
  toStatus: ApplicationStatus;
};

export type TransitionApplicationStatusWithHistoryData = {
  applicationId: string;
  expectedStatus: ApplicationStatus;
  history: CreateApplicationHistoryData;
  status: ApplicationStatus;
};

export type ListCandidateApplicationsFilter = {
  candidateIdentityId: string;
  page: number;
  pageSize: number;
  sort: 'newest' | 'oldest';
  statuses?: ApplicationStatus[];
};

export type CandidateApplicationStatusCount = {
  count: number;
  status: ApplicationStatus;
};

export type ListJobApplicationsFilter = {
  employerIdentityId: string;
  jobId: string;
  page: number;
  pageSize: number;
  status?: ApplicationStatus;
};

export interface ApplicationRepository {
  create(data: CreateApplicationData): Promise<ApplicationRecord>;
  createWithHistory(
    data: CreateApplicationData,
    history: CreateApplicationHistoryData
  ): Promise<ApplicationRecord>;
  createHistory(data: CreateApplicationHistoryData): Promise<ApplicationHistoryRecord>;
  findById(applicationId: string): Promise<ApplicationRecord | null>;
  findByIdAndCandidate(
    applicationId: string,
    candidateIdentityId: string
  ): Promise<ApplicationRecord | null>;
  findByIdAndEmployer(
    applicationId: string,
    employerIdentityId: string
  ): Promise<ApplicationRecord | null>;
  findByJobAndCandidate(
    jobId: string,
    candidateIdentityId: string
  ): Promise<ApplicationRecord | null>;
  listCandidate(
    filter: ListCandidateApplicationsFilter
  ): Promise<{ items: ApplicationRecord[]; total: number }>;
  countCandidateByStatus(
    candidateIdentityId: string
  ): Promise<CandidateApplicationStatusCount[]>;
  findLatestInterviewByApplicationId(
    applicationId: string
  ): Promise<ApplicationInterviewRecord | null>;
  findLatestOfferByApplicationId(
    applicationId: string
  ): Promise<ApplicationOfferRecord | null>;
  listHistory(applicationId: string): Promise<ApplicationHistoryRecord[]>;
  listLatestInterviewsByApplicationIds(
    applicationIds: string[]
  ): Promise<ApplicationInterviewRecord[]>;
  listLatestOffersByApplicationIds(
    applicationIds: string[]
  ): Promise<ApplicationOfferRecord[]>;
  listJobApplications(
    filter: ListJobApplicationsFilter
  ): Promise<{ items: ApplicationRecord[]; total: number }>;
  listCountsByJobIds(jobIds: string[]): Promise<Array<{ count: number; jobId: string }>>;
  updateStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<ApplicationRecord | null>;
  transitionStatusWithHistory(
    data: TransitionApplicationStatusWithHistoryData
  ): Promise<ApplicationRecord | null>;
  countByEmployer(employerIdentityId: string): Promise<number>;
  listEmployerDashboardPipeline(
    employerIdentityId: string,
    limit: number
  ): Promise<
    Array<{
      applicationId: string;
      appliedAt: Date;
      candidateIdentityId: string;
      jobId: string;
      status: ApplicationStatus;
      updatedAt: Date;
    }>
  >;
  listEmployerDashboardRecentActivities(
    employerIdentityId: string,
    limit: number
  ): Promise<
    Array<{
      applicationId: string;
      candidateIdentityId: string;
      createdAt: Date;
      eventType: string;
      id: string;
      jobId: string;
      newStatus: string | null;
      note: string | null;
      oldStatus: string | null;
    }>
  >;
  listRecruiterNotesByApplication(applicationId: string): Promise<
    Array<{
      applicationId: string;
      authorIdentityId: string;
      body: string;
      createdAt: Date;
      id: string;
      updatedAt: Date;
    }>
  >;
  findRecruiterNoteById(noteId: string): Promise<{
    applicationId: string;
    authorIdentityId: string;
    body: string;
    createdAt: Date;
    id: string;
    updatedAt: Date;
  } | null>;
  createRecruiterNote(data: {
    applicationId: string;
    authorIdentityId: string;
    body: string;
    id: string;
  }): Promise<{
    applicationId: string;
    authorIdentityId: string;
    body: string;
    createdAt: Date;
    id: string;
    updatedAt: Date;
  }>;
  updateRecruiterNote(
    noteId: string,
    body: string
  ): Promise<{
    applicationId: string;
    authorIdentityId: string;
    body: string;
    createdAt: Date;
    id: string;
    updatedAt: Date;
  } | null>;
  deleteRecruiterNote(noteId: string): Promise<boolean>;
}
