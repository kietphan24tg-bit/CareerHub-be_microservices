import type { PrismaClientLike } from '@careerhub/infrastructure';

export type ApplicationPersistenceRecord = {
  candidateIdentityId: string;
  coverLetter: string | null;
  createdAt: Date;
  employerIdentityId: string;
  id: string;
  jobId: string;
  resumeId: string;
  status: string;
  updatedAt: Date;
};

export type ApplicationHistoryPersistenceRecord = {
  actorIdentityId: string | null;
  actorType: string;
  applicationId: string;
  createdAt: Date;
  eventType: string;
  fromStatus: string | null;
  id: string;
  note: string | null;
  toStatus: string;
};

export type InterviewPersistenceRecord = {
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
  interviewers: unknown;
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

export type OfferBenefitPersistenceRecord = {
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

export type BenefitCatalogPersistenceRecord = {
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

export type OfferPersistenceRecord = {
  applicationId: string;
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

export type ApplicationCreateInput = {
  candidateIdentityId: string;
  coverLetter: string | null;
  employerIdentityId: string;
  id: string;
  jobId: string;
  resumeId: string;
  status: string;
};

export type ApplicationHistoryCreateInput = {
  actorIdentityId: string | null;
  actorType: string;
  applicationId: string;
  eventType: string;
  fromStatus: string | null;
  id: string;
  note: string | null;
  toStatus: string;
};

export type InterviewCreateInput = Omit<InterviewPersistenceRecord, 'createdAt' | 'updatedAt'>;
export type InterviewUpdateInput = Partial<
  Omit<InterviewPersistenceRecord, 'applicationId' | 'candidateIdentityId' | 'createdAt' | 'employerIdentityId' | 'id' | 'jobId' | 'scheduledByIdentityId' | 'updatedAt'>
> & {
  updatedAt?: Date;
};

export type OfferCreateInput = Omit<OfferPersistenceRecord, 'createdAt' | 'updatedAt' | 'respondedAt' | 'sentAt' | 'viewedAt' | 'deletedAt'>;
export type OfferUpdateInput = Partial<
  Omit<OfferPersistenceRecord, 'applicationId' | 'candidateIdentityId' | 'createdAt' | 'createdByIdentityId' | 'employerIdentityId' | 'id' | 'jobId' | 'updatedAt'>
> & {
  updatedAt?: Date;
};

export type OfferBenefitCreateInput = Omit<OfferBenefitPersistenceRecord, 'createdAt' | 'updatedAt'>;

export type ApplicationWhereInput = Record<string, unknown>;

export type ApplicationModelDelegate = {
  count(args: { where?: ApplicationWhereInput }): Promise<number>;
  create(args: { data: ApplicationCreateInput }): Promise<ApplicationPersistenceRecord>;
  findFirst(args: {
    where?: ApplicationWhereInput;
  }): Promise<ApplicationPersistenceRecord | null>;
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
    skip?: number;
    take?: number;
  }): Promise<ApplicationPersistenceRecord[]>;
  findUnique(args: {
    where: { id: string };
  }): Promise<ApplicationPersistenceRecord | null>;
  updateMany(args: {
    data: { status: string; updatedAt?: Date };
    where?: ApplicationWhereInput;
  }): Promise<{ count: number }>;
};

export type ApplicationHistoryModelDelegate = {
  create(args: {
    data: ApplicationHistoryCreateInput;
  }): Promise<ApplicationHistoryPersistenceRecord>;
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ApplicationHistoryPersistenceRecord[]>;
};

export type InterviewModelDelegate = {
  create(args: { data: InterviewCreateInput }): Promise<InterviewPersistenceRecord>;
  findFirst(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<InterviewPersistenceRecord | null>;
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<InterviewPersistenceRecord[]>;
  updateMany(args: {
    data: InterviewUpdateInput;
    where?: ApplicationWhereInput;
  }): Promise<{ count: number }>;
};

export type OfferModelDelegate = {
  create(args: { data: OfferCreateInput }): Promise<OfferPersistenceRecord>;
  findFirst(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<OfferPersistenceRecord | null>;
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<OfferPersistenceRecord[]>;
  updateMany(args: {
    data: OfferUpdateInput;
    where?: ApplicationWhereInput;
  }): Promise<{ count: number }>;
};

export type OfferBenefitModelDelegate = {
  createMany(args: { data: OfferBenefitCreateInput[] }): Promise<{ count: number }>;
  deleteMany(args: { where?: ApplicationWhereInput }): Promise<{ count: number }>;
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<OfferBenefitPersistenceRecord[]>;
};

export type BenefitCatalogModelDelegate = {
  findMany(args: {
    where?: ApplicationWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  }): Promise<BenefitCatalogPersistenceRecord[]>;
};

export type ApplicationTransactionClient = {
  application: ApplicationModelDelegate;
  applicationHistory: ApplicationHistoryModelDelegate;
  benefitCatalog: BenefitCatalogModelDelegate;
  interview: InterviewModelDelegate;
  jobOffer: OfferModelDelegate;
  offerBenefit: OfferBenefitModelDelegate;
};

export type ApplicationPrismaClient = PrismaClientLike &
  ApplicationTransactionClient & {
    $transaction<T>(
      callback: (tx: ApplicationTransactionClient) => Promise<T>
    ): Promise<T>;
  };
