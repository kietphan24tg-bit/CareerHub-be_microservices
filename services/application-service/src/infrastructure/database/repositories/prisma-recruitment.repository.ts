import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  BenefitCatalogRecord,
  CreateInterviewData,
  CreateOfferBenefitData,
  CreateOfferData,
  InterviewerRecord,
  ListEmployerInterviewsFilters,
  ListEmployerOffersFilters,
  OfferBenefitRecord,
  PaginatedInterviewListResult,
  PaginatedOfferListResult,
  RecruitmentRepository,
  UpdateInterviewData,
  UpdateOfferData
} from '../../../application/ports/recruitment-repository.port';
import type {
  ApplicationPrismaRepositoryClient,
  BenefitCatalogPersistenceRecord,
  InterviewPersistenceRecord,
  OfferBenefitPersistenceRecord,
  OfferPersistenceRecord
} from '../prisma/application-prisma.types';
import { readInterviewers } from '../../../application/services/interview-schedule.utils';
import { OFFER_STATUS } from '../../../application/services/offer-validation.utils';

function mapInterviewers(value: unknown): InterviewerRecord[] {
  return readInterviewers(value);
}

function mapInterviewRecord(record: InterviewPersistenceRecord): ApplicationInterviewRecord {
  return {
    applicationId: record.applicationId,
    callerInfo: record.callerInfo,
    candidateIdentityId: record.candidateIdentityId,
    candidateProposedDate: record.candidateProposedDate,
    candidateProposedDurationMinutes: record.candidateProposedDurationMinutes,
    candidateProposedStartTime: record.candidateProposedStartTime,
    candidateProposedTimezone: record.candidateProposedTimezone,
    candidateResponseNote: record.candidateResponseNote,
    contactInfo: record.contactInfo,
    createdAt: record.createdAt,
    date: record.date,
    durationMinutes: record.durationMinutes,
    employerIdentityId: record.employerIdentityId,
    endTime: record.endTime,
    fullAddress: record.fullAddress,
    id: record.id,
    interviewerName: record.interviewerName,
    interviewerRole: record.interviewerRole,
    interviewers: mapInterviewers(record.interviewers),
    jobId: record.jobId,
    locationDetail: record.locationDetail,
    locationLat: record.locationLat,
    locationLng: record.locationLng,
    logisticsNote: record.logisticsNote,
    mapLink: record.mapLink,
    meetingId: record.meetingId,
    meetingLink: record.meetingLink,
    notesToCandidate: record.notesToCandidate,
    officeName: record.officeName,
    passcode: record.passcode,
    phoneNumber: record.phoneNumber,
    platform: record.platform,
    round: record.round,
    scheduledByIdentityId: record.scheduledByIdentityId,
    startTime: record.startTime,
    status: record.status,
    timezone: record.timezone,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function mapBenefitRecord(record: OfferBenefitPersistenceRecord): OfferBenefitRecord {
  return {
    amount: record.amount,
    annualLeaveDays: record.annualLeaveDays,
    catalogId: record.catalogId,
    createdAt: record.createdAt,
    currency: record.currency,
    description: record.description,
    frequency: record.frequency,
    hasMonetaryValue: record.hasMonetaryValue,
    id: record.id,
    metadata: record.metadata,
    name: record.name,
    offerId: record.offerId,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function mapOfferRecord(
  record: OfferPersistenceRecord,
  benefits: OfferBenefitPersistenceRecord[] = []
): ApplicationOfferRecord {
  return {
    applicationId: record.applicationId,
    benefits: benefits.map(mapBenefitRecord),
    bonusDetails: record.bonusDetails,
    candidateIdentityId: record.candidateIdentityId,
    contractDocumentUrl: record.contractDocumentUrl,
    createdAt: record.createdAt,
    createdByIdentityId: record.createdByIdentityId,
    currency: record.currency,
    deletedAt: record.deletedAt,
    departmentTeam: record.departmentTeam,
    employerIdentityId: record.employerIdentityId,
    employmentType: record.employmentType,
    expiresAt: record.expiresAt,
    id: record.id,
    jobId: record.jobId,
    location: record.location,
    message: record.message,
    probationCustom: record.probationCustom,
    probationType: record.probationType,
    reportingTo: record.reportingTo,
    respondedAt: record.respondedAt,
    salary: record.salary,
    salaryPeriod: record.salaryPeriod,
    seniorityLabel: record.seniorityLabel,
    sentAt: record.sentAt,
    startDate: record.startDate,
    status: record.status,
    title: record.title,
    updatedAt: record.updatedAt,
    viewedAt: record.viewedAt,
    workModel: record.workModel
  };
}

function mapBenefitCatalogRecord(record: BenefitCatalogPersistenceRecord): BenefitCatalogRecord {
  return {
    code: record.code,
    description: record.description,
    hasMonetaryValueDefault: record.hasMonetaryValueDefault,
    id: record.id,
    isActive: record.isActive,
    isSelectable: record.isSelectable,
    label: record.label,
    requiresAmount: record.requiresAmount,
    requiresAnnualLeaveDays: record.requiresAnnualLeaveDays,
    requiresFrequency: record.requiresFrequency,
    sortOrder: record.sortOrder
  };
}

export class PrismaRecruitmentRepository implements RecruitmentRepository {
  constructor(private readonly prismaClient: ApplicationPrismaRepositoryClient) {}

  async listEmployerInterviews(employerIdentityId: string): Promise<ApplicationInterviewRecord[]> {
    const result = await this.listEmployerInterviewsPage(employerIdentityId, {
      page: 1,
      pageSize: 10_000
    });

    return result.items;
  }

  async listEmployerInterviewsPage(
    employerIdentityId: string,
    filters: ListEmployerInterviewsFilters = {}
  ): Promise<PaginatedInterviewListResult> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: {
      employerIdentityId: string;
      status?: string;
      type?: string;
      date?: string | { gte?: string; lt?: string };
    } = { employerIdentityId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.date) {
      where.date = filters.date;
    } else if (filters.dateFrom || filters.dateTo) {
      where.date = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lt: filters.dateTo } : {})
      };
    }

    const [records, total] = await Promise.all([
      this.prismaClient.interview.findMany({
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where
      }),
      this.prismaClient.interview.count({ where })
    ]);

    return {
      items: records.map(mapInterviewRecord),
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async findInterviewById(interviewId: string): Promise<ApplicationInterviewRecord | null> {
    const record = await this.prismaClient.interview.findFirst({
      where: { id: interviewId }
    });

    return record ? mapInterviewRecord(record) : null;
  }

  async findInterviewByIdAndEmployer(
    interviewId: string,
    employerIdentityId: string
  ): Promise<ApplicationInterviewRecord | null> {
    const record = await this.prismaClient.interview.findFirst({
      where: {
        employerIdentityId,
        id: interviewId
      }
    });

    return record ? mapInterviewRecord(record) : null;
  }

  async findInterviewByIdAndCandidate(
    interviewId: string,
    candidateIdentityId: string
  ): Promise<ApplicationInterviewRecord | null> {
    const record = await this.prismaClient.interview.findFirst({
      where: {
        candidateIdentityId,
        id: interviewId
      }
    });

    return record ? mapInterviewRecord(record) : null;
  }

  async findInterviewByApplicationAndCandidate(
    applicationId: string,
    candidateIdentityId: string
  ): Promise<ApplicationInterviewRecord | null> {
    const record = await this.prismaClient.interview.findFirst({
      orderBy: [{ createdAt: 'desc' }],
      where: {
        applicationId,
        candidateIdentityId
      }
    });

    return record ? mapInterviewRecord(record) : null;
  }

  async createInterview(data: CreateInterviewData): Promise<ApplicationInterviewRecord> {
    const record = await this.prismaClient.interview.create({
      data: {
        applicationId: data.applicationId,
        callerInfo: data.callerInfo,
        candidateIdentityId: data.candidateIdentityId,
        candidateProposedDate: null,
        candidateProposedDurationMinutes: null,
        candidateProposedStartTime: null,
        candidateProposedTimezone: null,
        candidateResponseNote: null,
        contactInfo: data.contactInfo,
        date: data.date,
        durationMinutes: data.durationMinutes,
        employerIdentityId: data.employerIdentityId,
        endTime: data.endTime,
        fullAddress: data.fullAddress,
        id: data.id,
        interviewerName: null,
        interviewerRole: null,
        interviewers: data.interviewers,
        jobId: data.jobId,
        locationDetail: data.locationDetail,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        logisticsNote: data.logisticsNote,
        mapLink: data.mapLink,
        meetingId: data.meetingId,
        meetingLink: data.meetingLink,
        notesToCandidate: data.notesToCandidate,
        officeName: data.officeName,
        passcode: data.passcode,
        phoneNumber: data.phoneNumber,
        platform: data.platform,
        round: data.round,
        scheduledByIdentityId: data.scheduledByIdentityId,
        startTime: data.startTime,
        status: data.status,
        timezone: data.timezone,
        type: data.type
      }
    });

    return mapInterviewRecord(record);
  }

  async updateInterview(
    interviewId: string,
    data: UpdateInterviewData
  ): Promise<ApplicationInterviewRecord | null> {
    return this.updateInterviewIfStatus(interviewId, [], data);
  }

  async updateInterviewIfStatus(
    interviewId: string,
    expectedStatuses: string[],
    data: UpdateInterviewData
  ): Promise<ApplicationInterviewRecord | null> {
    const result = await this.prismaClient.interview.updateMany({
      data: {
        ...data,
        updatedAt: new Date()
      },
      where: {
        id: interviewId,
        ...(expectedStatuses.length > 0
          ? {
              status: {
                in: expectedStatuses
              }
            }
          : {})
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findInterviewById(interviewId);
  }

  async listBenefitCatalog(): Promise<BenefitCatalogRecord[]> {
    const records = await this.prismaClient.benefitCatalog.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      where: { isActive: true }
    });

    return records.map(mapBenefitCatalogRecord);
  }

  async findOfferByApplicationId(applicationId: string): Promise<ApplicationOfferRecord | null> {
    const record = await this.prismaClient.jobOffer.findFirst({
      where: {
        applicationId,
        deletedAt: null
      }
    });

    if (!record) {
      return null;
    }

    const benefits = await this.loadOfferBenefits(record.id);
    return mapOfferRecord(record, benefits);
  }

  async findOfferById(offerId: string): Promise<ApplicationOfferRecord | null> {
    const record = await this.prismaClient.jobOffer.findFirst({
      where: {
        deletedAt: null,
        id: offerId
      }
    });

    if (!record) {
      return null;
    }

    const benefits = await this.loadOfferBenefits(record.id);
    return mapOfferRecord(record, benefits);
  }

  async findOfferByIdAndEmployer(
    offerId: string,
    employerIdentityId: string
  ): Promise<ApplicationOfferRecord | null> {
    const record = await this.prismaClient.jobOffer.findFirst({
      where: {
        deletedAt: null,
        employerIdentityId,
        id: offerId
      }
    });

    if (!record) {
      return null;
    }

    const benefits = await this.loadOfferBenefits(record.id);
    return mapOfferRecord(record, benefits);
  }

  async findOfferByIdAndCandidate(
    offerId: string,
    candidateIdentityId: string
  ): Promise<ApplicationOfferRecord | null> {
    const record = await this.prismaClient.jobOffer.findFirst({
      where: {
        candidateIdentityId,
        deletedAt: null,
        id: offerId
      }
    });

    if (!record) {
      return null;
    }

    const benefits = await this.loadOfferBenefits(record.id);
    return mapOfferRecord(record, benefits);
  }

  async listOffersByApplicationId(applicationId: string): Promise<ApplicationOfferRecord[]> {
    const records = await this.prismaClient.jobOffer.findMany({
      orderBy: [{ createdAt: 'desc' }],
      where: {
        applicationId,
        deletedAt: null
      }
    });

    const offers: ApplicationOfferRecord[] = [];
    for (const record of records) {
      const benefits = await this.loadOfferBenefits(record.id);
      offers.push(mapOfferRecord(record, benefits));
    }

    return offers;
  }

  async listEmployerOffersPage(
    employerIdentityId: string,
    filters: ListEmployerOffersFilters = {}
  ): Promise<PaginatedOfferListResult> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
    const where: {
      deletedAt: null;
      employerIdentityId: string;
      status?: string;
      workModel?: string;
    } = {
      deletedAt: null,
      employerIdentityId
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.workModel) {
      where.workModel = filters.workModel;
    }

    const [records, total] = await Promise.all([
      this.prismaClient.jobOffer.findMany({
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        where
      }),
      this.prismaClient.jobOffer.count({ where })
    ]);

    return {
      items: records.map((record) => mapOfferRecord(record)),
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async createOffer(
    data: CreateOfferData,
    benefits: CreateOfferBenefitData[]
  ): Promise<ApplicationOfferRecord> {
    const record = await this.prismaClient.jobOffer.create({
      data: {
        applicationId: data.applicationId,
        bonusDetails: data.bonusDetails,
        candidateIdentityId: data.candidateIdentityId,
        contractDocumentUrl: data.contractDocumentUrl,
        createdByIdentityId: data.createdByIdentityId,
        currency: data.currency,
        departmentTeam: data.departmentTeam,
        employerIdentityId: data.employerIdentityId,
        employmentType: data.employmentType,
        expiresAt: data.expiresAt,
        id: data.id,
        jobId: data.jobId,
        location: data.location,
        message: data.message,
        probationCustom: data.probationCustom,
        probationType: data.probationType,
        reportingTo: data.reportingTo,
        salary: data.salary,
        salaryPeriod: data.salaryPeriod,
        seniorityLabel: data.seniorityLabel,
        startDate: data.startDate,
        status: data.status,
        title: data.title,
        workModel: data.workModel
      }
    });

    if (benefits.length > 0) {
      await this.prismaClient.offerBenefit.createMany({
        data: benefits.map((benefit) => ({
          amount: benefit.amount,
          annualLeaveDays: benefit.annualLeaveDays,
          catalogId: benefit.catalogId,
          currency: benefit.currency,
          description: benefit.description,
          frequency: benefit.frequency,
          hasMonetaryValue: benefit.hasMonetaryValue,
          id: benefit.id,
          metadata: benefit.metadata,
          name: benefit.name,
          offerId: record.id,
          type: benefit.type
        }))
      });
    }

    const createdBenefits = await this.loadOfferBenefits(record.id);
    return mapOfferRecord(record, createdBenefits);
  }

  async updateOffer(
    offerId: string,
    data: UpdateOfferData,
    benefits?: CreateOfferBenefitData[] | null
  ): Promise<ApplicationOfferRecord | null> {
    return this.updateOfferIfStatus(offerId, [], data, benefits);
  }

  async updateOfferIfStatus(
    offerId: string,
    expectedStatuses: string[],
    data: UpdateOfferData,
    benefits?: CreateOfferBenefitData[] | null
  ): Promise<ApplicationOfferRecord | null> {
    const result = await this.prismaClient.jobOffer.updateMany({
      data: {
        ...data,
        updatedAt: new Date()
      },
      where: {
        deletedAt: null,
        id: offerId,
        ...(expectedStatuses.length > 0
          ? {
              status: {
                in: expectedStatuses
              }
            }
          : {})
      }
    });

    if (result.count === 0) {
      return null;
    }

    if (benefits !== undefined) {
      await this.replaceOfferBenefits(offerId, benefits ?? []);
    }

    return this.findOfferById(offerId);
  }

  async replaceOfferBenefits(offerId: string, benefits: CreateOfferBenefitData[]): Promise<void> {
    await this.prismaClient.offerBenefit.deleteMany({
      where: { offerId }
    });

    if (benefits.length === 0) {
      return;
    }

    await this.prismaClient.offerBenefit.createMany({
      data: benefits.map((benefit) => ({
        amount: benefit.amount,
        annualLeaveDays: benefit.annualLeaveDays,
        catalogId: benefit.catalogId,
        currency: benefit.currency,
        description: benefit.description,
        frequency: benefit.frequency,
        hasMonetaryValue: benefit.hasMonetaryValue,
        id: benefit.id,
        metadata: benefit.metadata,
        name: benefit.name,
        offerId,
        type: benefit.type
      }))
    });
  }

  async softDeleteOffer(offerId: string, deletedAt: Date): Promise<boolean> {
    return this.softDeleteOfferIfStatus(offerId, [], deletedAt);
  }

  async softDeleteOfferIfStatus(
    offerId: string,
    expectedStatuses: string[],
    deletedAt: Date
  ): Promise<boolean> {
    const result = await this.prismaClient.jobOffer.updateMany({
      data: {
        deletedAt,
        updatedAt: deletedAt
      },
      where: {
        deletedAt: null,
        id: offerId,
        ...(expectedStatuses.length > 0
          ? {
              status: {
                in: expectedStatuses
              }
            }
          : {})
      }
    });

    return result.count > 0;
  }

  async expireOpenOffersForApplication(applicationId: string, now: Date): Promise<void> {
    await this.prismaClient.jobOffer.updateMany({
      data: {
        status: OFFER_STATUS.expired,
        updatedAt: now
      },
      where: {
        applicationId,
        deletedAt: null,
        expiresAt: {
          lt: now
        },
        status: {
          in: [OFFER_STATUS.sent, OFFER_STATUS.viewed]
        }
      }
    });
  }

  async expireOpenOffersForEmployer(employerIdentityId: string, now: Date): Promise<void> {
    await this.prismaClient.jobOffer.updateMany({
      data: {
        status: OFFER_STATUS.expired,
        updatedAt: now
      },
      where: {
        deletedAt: null,
        employerIdentityId,
        expiresAt: {
          lt: now
        },
        status: {
          in: [OFFER_STATUS.sent, OFFER_STATUS.viewed]
        }
      }
    });
  }

  async expireOfferIfDue(offerId: string, now: Date): Promise<void> {
    await this.prismaClient.jobOffer.updateMany({
      data: {
        status: OFFER_STATUS.expired,
        updatedAt: now
      },
      where: {
        deletedAt: null,
        expiresAt: {
          lt: now
        },
        id: offerId,
        status: {
          in: [OFFER_STATUS.sent, OFFER_STATUS.viewed]
        }
      }
    });
  }

  private async loadOfferBenefits(offerId: string): Promise<OfferBenefitPersistenceRecord[]> {
    return this.prismaClient.offerBenefit.findMany({
      orderBy: { id: 'asc' },
      where: { offerId }
    });
  }

  async countOpenOffersByEmployer(employerIdentityId: string): Promise<number> {
    return this.prismaClient.jobOffer.count({
      where: {
        deletedAt: null,
        employerIdentityId,
        status: {
          in: [OFFER_STATUS.sent, OFFER_STATUS.viewed]
        }
      }
    });
  }

  async countEmployerInterviewsForDate(
    employerIdentityId: string,
    localDate: string,
    statuses: string[]
  ): Promise<number> {
    return this.prismaClient.interview.count({
      where: {
        date: localDate,
        employerIdentityId,
        status: {
          in: statuses
        }
      }
    });
  }

  async countCandidateInterviewsByStatuses(
    candidateIdentityId: string,
    localDate: string,
    statuses: string[]
  ): Promise<number> {
    return this.prismaClient.interview.count({
      where: {
        candidateIdentityId,
        date: {
          gte: localDate
        },
        status: {
          in: statuses
        }
      }
    });
  }

  async listEmployerInterviewsForDate(
    employerIdentityId: string,
    localDate: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationInterviewRecord[]> {
    const records = await this.prismaClient.interview.findMany({
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      where: {
        date: localDate,
        employerIdentityId,
        status: {
          in: statuses
        }
      }
    });

    return records.map(mapInterviewRecord);
  }

  async listCandidateUpcomingInterviews(
    candidateIdentityId: string,
    localDate: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationInterviewRecord[]> {
    const records = await this.prismaClient.interview.findMany({
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      where: {
        candidateIdentityId,
        date: {
          gte: localDate
        },
        status: {
          in: statuses
        }
      }
    });

    return records.map(mapInterviewRecord);
  }

  async listCandidateActiveOffers(
    candidateIdentityId: string,
    statuses: string[],
    limit: number
  ): Promise<ApplicationOfferRecord[]> {
    const records = await this.prismaClient.jobOffer.findMany({
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      where: {
        candidateIdentityId,
        deletedAt: null,
        status: {
          in: statuses
        }
      }
    });

    const offers: ApplicationOfferRecord[] = [];

    for (const record of records) {
      const benefits = await this.loadOfferBenefits(record.id);
      offers.push(mapOfferRecord(record, benefits));
    }

    return offers;
  }
}
