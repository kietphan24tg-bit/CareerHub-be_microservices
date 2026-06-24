export type InterviewerRecord = {
  name: string;
  role: string | null;
};

export type ApplicationInterviewRecord = {
  applicationId: string;
  callerInfo: string | null;
  candidateIdentityId: string;
  candidateProposedDate: string | null;
  candidateProposedDurationMinutes: number | null;
  candidateProposedStartTime: string | null;
  candidateProposedTimezone: string | null;
  candidateResponseNote: string | null;
  contactInfo: string | null;
  createdAt: Date;
  date: string | null;
  durationMinutes: number | null;
  employerIdentityId: string;
  endTime: string | null;
  fullAddress: string | null;
  id: string;
  interviewerName: string | null;
  interviewerRole: string | null;
  interviewers: InterviewerRecord[];
  jobId: string;
  locationDetail: string | null;
  locationLat: string | null;
  locationLng: string | null;
  logisticsNote: string | null;
  mapLink: string | null;
  meetingId: string | null;
  meetingLink: string | null;
  notesToCandidate: string | null;
  officeName: string | null;
  passcode: string | null;
  phoneNumber: string | null;
  platform: string | null;
  round: string;
  scheduledByIdentityId: string;
  startTime: string | null;
  status: string;
  timezone: string | null;
  type: string;
  updatedAt: Date;
};

export type OfferBenefitRecord = {
  amount: string | null;
  annualLeaveDays: number | null;
  catalogId: string | null;
  createdAt: Date;
  currency: string | null;
  description: string | null;
  frequency: string | null;
  hasMonetaryValue: boolean;
  id: string;
  metadata: Record<string, unknown> | null;
  name: string | null;
  offerId: string;
  type: string;
  updatedAt: Date;
};

export type BenefitCatalogRecord = {
  code: string;
  description: string | null;
  hasMonetaryValueDefault: boolean;
  id: string;
  isActive: boolean;
  isSelectable: boolean;
  label: string;
  requiresAmount: boolean;
  requiresAnnualLeaveDays: boolean;
  requiresFrequency: boolean;
  sortOrder: number;
};

export type ApplicationOfferRecord = {
  applicationId: string;
  benefits: OfferBenefitRecord[];
  bonusDetails: string | null;
  candidateIdentityId: string;
  contractDocumentUrl: string | null;
  createdAt: Date;
  createdByIdentityId: string;
  currency: string | null;
  deletedAt: Date | null;
  departmentTeam: string | null;
  employerIdentityId: string;
  employmentType: string | null;
  expiresAt: Date | null;
  id: string;
  jobId: string;
  location: string | null;
  message: string | null;
  probationCustom: string | null;
  probationType: string | null;
  reportingTo: string | null;
  respondedAt: Date | null;
  salary: string | null;
  salaryPeriod: string | null;
  seniorityLabel: string | null;
  sentAt: Date | null;
  startDate: string | null;
  status: string;
  title: string;
  updatedAt: Date;
  viewedAt: Date | null;
  workModel: string | null;
};

export type CreateInterviewData = {
  applicationId: string;
  callerInfo: string | null;
  candidateIdentityId: string;
  contactInfo: string | null;
  date: string | null;
  durationMinutes: number | null;
  employerIdentityId: string;
  endTime: string | null;
  fullAddress: string | null;
  id: string;
  interviewers: InterviewerRecord[];
  jobId: string;
  locationDetail: string | null;
  locationLat: string | null;
  locationLng: string | null;
  logisticsNote: string | null;
  mapLink: string | null;
  meetingId: string | null;
  meetingLink: string | null;
  notesToCandidate: string | null;
  officeName: string | null;
  passcode: string | null;
  phoneNumber: string | null;
  platform: string | null;
  round: string;
  scheduledByIdentityId: string;
  startTime: string | null;
  status: string;
  timezone: string | null;
  type: string;
};

export type UpdateInterviewData = Partial<
  Omit<
    CreateInterviewData,
    'applicationId' | 'candidateIdentityId' | 'employerIdentityId' | 'id' | 'jobId' | 'scheduledByIdentityId'
  >
> & {
  candidateProposedDate?: string | null;
  candidateProposedDurationMinutes?: number | null;
  candidateProposedStartTime?: string | null;
  candidateProposedTimezone?: string | null;
  candidateResponseNote?: string | null;
};

export type CreateOfferBenefitData = {
  amount: string | null;
  annualLeaveDays: number | null;
  catalogId: string | null;
  currency: string | null;
  description: string | null;
  frequency: string | null;
  hasMonetaryValue: boolean;
  id: string;
  metadata: Record<string, unknown> | null;
  name: string | null;
  type: string;
};

export type CreateOfferData = {
  applicationId: string;
  bonusDetails: string | null;
  candidateIdentityId: string;
  contractDocumentUrl: string | null;
  createdByIdentityId: string;
  currency: string | null;
  departmentTeam: string | null;
  employerIdentityId: string;
  employmentType: string | null;
  expiresAt: Date | null;
  id: string;
  jobId: string;
  location: string | null;
  message: string | null;
  probationCustom: string | null;
  probationType: string | null;
  reportingTo: string | null;
  salary: string | null;
  salaryPeriod: string | null;
  seniorityLabel: string | null;
  startDate: string | null;
  status: string;
  title: string;
  workModel: string | null;
};

export type UpdateOfferData = Partial<
  Omit<
    CreateOfferData,
    | 'applicationId'
    | 'candidateIdentityId'
    | 'createdByIdentityId'
    | 'employerIdentityId'
    | 'id'
    | 'jobId'
    | 'status'
  >
> & {
  respondedAt?: Date | null;
  sentAt?: Date | null;
  status?: string;
  viewedAt?: Date | null;
  deletedAt?: Date | null;
};

export type ListEmployerInterviewsFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
};

export type PaginatedInterviewListResult = {
  items: ApplicationInterviewRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export interface RecruitmentRepository {
  listEmployerInterviews(employerIdentityId: string): Promise<ApplicationInterviewRecord[]>;
  listEmployerInterviewsPage(
    employerIdentityId: string,
    filters?: ListEmployerInterviewsFilters
  ): Promise<PaginatedInterviewListResult>;
  findInterviewById(interviewId: string): Promise<ApplicationInterviewRecord | null>;
  findInterviewByIdAndEmployer(
    interviewId: string,
    employerIdentityId: string
  ): Promise<ApplicationInterviewRecord | null>;
  findInterviewByIdAndCandidate(
    interviewId: string,
    candidateIdentityId: string
  ): Promise<ApplicationInterviewRecord | null>;
  findInterviewByApplicationAndCandidate(
    applicationId: string,
    candidateIdentityId: string
  ): Promise<ApplicationInterviewRecord | null>;
  createInterview(data: CreateInterviewData): Promise<ApplicationInterviewRecord>;
  updateInterview(
    interviewId: string,
    data: UpdateInterviewData
  ): Promise<ApplicationInterviewRecord | null>;
  updateInterviewIfStatus(
    interviewId: string,
    expectedStatuses: string[],
    data: UpdateInterviewData
  ): Promise<ApplicationInterviewRecord | null>;

  listBenefitCatalog(): Promise<BenefitCatalogRecord[]>;
  findOfferByApplicationId(applicationId: string): Promise<ApplicationOfferRecord | null>;
  findOfferById(offerId: string): Promise<ApplicationOfferRecord | null>;
  findOfferByIdAndEmployer(
    offerId: string,
    employerIdentityId: string
  ): Promise<ApplicationOfferRecord | null>;
  findOfferByIdAndCandidate(
    offerId: string,
    candidateIdentityId: string
  ): Promise<ApplicationOfferRecord | null>;
  listOffersByApplicationId(applicationId: string): Promise<ApplicationOfferRecord[]>;
  createOffer(
    data: CreateOfferData,
    benefits: CreateOfferBenefitData[]
  ): Promise<ApplicationOfferRecord>;
  updateOffer(
    offerId: string,
    data: UpdateOfferData,
    benefits?: CreateOfferBenefitData[] | null
  ): Promise<ApplicationOfferRecord | null>;
  updateOfferIfStatus(
    offerId: string,
    expectedStatuses: string[],
    data: UpdateOfferData,
    benefits?: CreateOfferBenefitData[] | null
  ): Promise<ApplicationOfferRecord | null>;
  replaceOfferBenefits(offerId: string, benefits: CreateOfferBenefitData[]): Promise<void>;
  softDeleteOffer(offerId: string, deletedAt: Date): Promise<boolean>;
  softDeleteOfferIfStatus(
    offerId: string,
    expectedStatuses: string[],
    deletedAt: Date
  ): Promise<boolean>;
  expireOpenOffersForApplication(applicationId: string, now: Date): Promise<void>;
  expireOfferIfDue(offerId: string, now: Date): Promise<void>;
  countOpenOffersByEmployer(employerIdentityId: string): Promise<number>;
  countEmployerInterviewsForDate(
    employerIdentityId: string,
    localDate: string,
    statuses: string[]
  ): Promise<number>;
  countCandidateInterviewsByStatuses(
    candidateIdentityId: string,
    localDate: string,
    statuses: string[]
  ): Promise<number>;
  listEmployerInterviewsForDate(
    employerIdentityId: string,
    localDate: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationInterviewRecord[]>;
  listCandidateUpcomingInterviews(
    candidateIdentityId: string,
    localDate: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationInterviewRecord[]>;
  listCandidateActiveOffers(
    candidateIdentityId: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationOfferRecord[]>;
}
