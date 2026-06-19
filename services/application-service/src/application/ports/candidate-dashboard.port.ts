export type CandidateDashboardRecentApplicationRecord = {
  applicationId: string;
  appliedAt: Date;
  employerIdentityId: string;
  jobId: string;
  status: string;
  updatedAt: Date;
};

export type CandidateDashboardUpcomingInterviewRecord = {
  applicationId: string;
  date: string | null;
  employerIdentityId: string;
  id: string;
  jobId: string;
  round: string;
  startTime: string | null;
  status: string;
  type: string;
};

export type CandidateDashboardActiveOfferRecord = {
  applicationId: string;
  currency: string | null;
  employerIdentityId: string;
  expiresAt: Date | null;
  id: string;
  jobId: string;
  salary: string | null;
  sentAt: Date | null;
  status: string;
  title: string;
};

export type CandidateDashboardData = {
  activeOffers: CandidateDashboardActiveOfferRecord[];
  recentApplications: CandidateDashboardRecentApplicationRecord[];
  summary: {
    activeInterviews: number;
    activeOffers: number;
    totalApplications: number;
  };
  upcomingInterviews: CandidateDashboardUpcomingInterviewRecord[];
};
