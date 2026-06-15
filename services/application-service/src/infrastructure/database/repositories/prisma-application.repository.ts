import { InfrastructureError } from '@careerhub/infrastructure';
import type {
  ApplicationHistoryRecord,
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  ApplicationRecord,
  ApplicationRepository,
  ApplicationStatus,
  CandidateApplicationStatusCount,
  CreateApplicationData,
  CreateApplicationHistoryData,
  ListCandidateApplicationsFilter,
  ListJobApplicationsFilter,
  TransitionApplicationStatusWithHistoryData
} from '../../../application';
import { DuplicateApplicationError } from '../../../application/errors/duplicate-application.error';
import type {
  ApplicationHistoryPersistenceRecord,
  ApplicationPersistenceRecord,
  ApplicationPrismaRepositoryClient,
  InterviewPersistenceRecord,
  OfferPersistenceRecord
} from '../prisma/application-prisma.types';

function hasPrismaTransaction(
  client: ApplicationPrismaRepositoryClient
): client is ApplicationPrismaRepositoryClient & {
  $transaction: <T>(
    callback: (tx: ApplicationPrismaRepositoryClient) => Promise<T>
  ) => Promise<T>;
} {
  return typeof (client as { $transaction?: unknown }).$transaction === 'function';
}

function mapRecord(record: ApplicationPersistenceRecord): ApplicationRecord {
  return {
    candidateIdentityId: record.candidateIdentityId,
    coverLetter: record.coverLetter,
    createdAt: record.createdAt,
    employerIdentityId: record.employerIdentityId,
    id: record.id,
    jobId: record.jobId,
    resumeId: record.resumeId,
    status: record.status as ApplicationStatus,
    updatedAt: record.updatedAt
  };
}

function mapHistoryRecord(
  record: ApplicationHistoryPersistenceRecord
): ApplicationHistoryRecord {
  return {
    actorIdentityId: record.actorIdentityId,
    actorType: record.actorType as 'candidate' | 'employer' | 'system',
    applicationId: record.applicationId,
    createdAt: record.createdAt,
    eventType: record.eventType,
    fromStatus: record.fromStatus as ApplicationStatus | null,
    id: record.id,
    note: record.note,
    toStatus: record.toStatus as ApplicationStatus
  };
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
    interviewers: [],
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

function mapOfferRecord(record: OfferPersistenceRecord): ApplicationOfferRecord {
  return {
    applicationId: record.applicationId,
    benefits: [],
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

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Unique constraint failed') ||
    error.message.includes('applications_job_id_candidate_identity_id_key')
  );
}

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prismaClient: ApplicationPrismaRepositoryClient) {}

  async create(data: CreateApplicationData): Promise<ApplicationRecord> {
    try {
      const record = await this.prismaClient.application.create({
        data: {
          candidateIdentityId: data.candidateIdentityId,
          coverLetter: data.coverLetter,
          employerIdentityId: data.employerIdentityId,
          id: data.id,
          jobId: data.jobId,
          resumeId: data.resumeId,
          status: data.status
        }
      });

      return mapRecord(record);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateApplicationError(data.jobId, data.candidateIdentityId);
      }

      throw new InfrastructureError('Failed to create application', {
        cause: error instanceof Error ? error : undefined,
        code: 'APPLICATION_CREATE_FAILED'
      });
    }
  }

  async createWithHistory(
    data: CreateApplicationData,
    history: CreateApplicationHistoryData
  ): Promise<ApplicationRecord> {
    try {
      const work = async (client: ApplicationPrismaRepositoryClient) => {
        const application = await client.application.create({
          data: {
            candidateIdentityId: data.candidateIdentityId,
            coverLetter: data.coverLetter,
            employerIdentityId: data.employerIdentityId,
            id: data.id,
            jobId: data.jobId,
            resumeId: data.resumeId,
            status: data.status
          }
        });

        await client.applicationHistory.create({
          data: {
            actorIdentityId: history.actorIdentityId,
            actorType: history.actorType,
            applicationId: history.applicationId,
            eventType: history.eventType,
            fromStatus: history.fromStatus,
            id: history.id,
            note: history.note,
            toStatus: history.toStatus
          }
        });

        return application;
      };

      const record = hasPrismaTransaction(this.prismaClient)
        ? await this.prismaClient.$transaction(work)
        : await work(this.prismaClient);

      return mapRecord(record);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateApplicationError(data.jobId, data.candidateIdentityId);
      }

      throw new InfrastructureError('Failed to create application with history', {
        cause: error instanceof Error ? error : undefined,
        code: 'APPLICATION_CREATE_WITH_HISTORY_FAILED'
      });
    }
  }

  async createHistory(
    data: CreateApplicationHistoryData
  ): Promise<ApplicationHistoryRecord> {
    const record = await this.prismaClient.applicationHistory.create({
      data: {
        actorIdentityId: data.actorIdentityId,
        actorType: data.actorType,
        applicationId: data.applicationId,
        eventType: data.eventType,
        fromStatus: data.fromStatus,
        id: data.id,
        note: data.note,
        toStatus: data.toStatus
      }
    });

    return mapHistoryRecord(record);
  }

  async findById(applicationId: string): Promise<ApplicationRecord | null> {
    const record = await this.prismaClient.application.findUnique({
      where: { id: applicationId }
    });

    return record ? mapRecord(record) : null;
  }

  async findByIdAndCandidate(
    applicationId: string,
    candidateIdentityId: string
  ): Promise<ApplicationRecord | null> {
    const record = await this.prismaClient.application.findFirst({
      where: {
        candidateIdentityId,
        id: applicationId
      }
    });

    return record ? mapRecord(record) : null;
  }

  async findByIdAndEmployer(
    applicationId: string,
    employerIdentityId: string
  ): Promise<ApplicationRecord | null> {
    const record = await this.prismaClient.application.findFirst({
      where: {
        employerIdentityId,
        id: applicationId
      }
    });

    return record ? mapRecord(record) : null;
  }

  async findByJobAndCandidate(
    jobId: string,
    candidateIdentityId: string
  ): Promise<ApplicationRecord | null> {
    const record = await this.prismaClient.application.findFirst({
      where: {
        candidateIdentityId,
        jobId
      }
    });

    return record ? mapRecord(record) : null;
  }

  async listCandidate(
    filter: ListCandidateApplicationsFilter
  ): Promise<{ items: ApplicationRecord[]; total: number }> {
    const where = {
      candidateIdentityId: filter.candidateIdentityId,
      ...(filter.statuses && filter.statuses.length > 0
        ? {
            status: {
              in: filter.statuses
            }
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prismaClient.application.findMany({
        orderBy: {
          createdAt: filter.sort === 'oldest' ? 'asc' : 'desc'
        },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        where
      }),
      this.prismaClient.application.count({ where })
    ]);

    return {
      items: items.map(mapRecord),
      total
    };
  }

  async listHistory(applicationId: string): Promise<ApplicationHistoryRecord[]> {
    const records = await this.prismaClient.applicationHistory.findMany({
      orderBy: { createdAt: 'desc' },
      where: { applicationId }
    });

    return records.map(mapHistoryRecord);
  }

  async countCandidateByStatus(
    candidateIdentityId: string
  ): Promise<CandidateApplicationStatusCount[]> {
    const rows = await this.prismaClient.application.findMany({
      where: {
        candidateIdentityId
      }
    });
    const counts = new Map<ApplicationStatus, number>();

    for (const row of rows) {
      const status = row.status as ApplicationStatus;
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({
      count,
      status
    }));
  }

  async findLatestInterviewByApplicationId(
    applicationId: string
  ): Promise<ApplicationInterviewRecord | null> {
    const record = await this.prismaClient.interview.findFirst({
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }, { createdAt: 'desc' }],
      where: { applicationId }
    });

    return record ? mapInterviewRecord(record) : null;
  }

  async findLatestOfferByApplicationId(
    applicationId: string
  ): Promise<ApplicationOfferRecord | null> {
    const record = await this.prismaClient.jobOffer.findFirst({
      orderBy: [{ createdAt: 'desc' }],
      where: {
        applicationId,
        deletedAt: null
      }
    });

    return record ? mapOfferRecord(record) : null;
  }

  async listLatestInterviewsByApplicationIds(
    applicationIds: string[]
  ): Promise<ApplicationInterviewRecord[]> {
    if (applicationIds.length === 0) {
      return [];
    }

    const records = await this.prismaClient.interview.findMany({
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }, { createdAt: 'desc' }],
      where: {
        applicationId: {
          in: applicationIds
        }
      }
    });
    const byApplicationId = new Map<string, ApplicationInterviewRecord>();

    for (const record of records) {
      if (!byApplicationId.has(record.applicationId)) {
        byApplicationId.set(record.applicationId, mapInterviewRecord(record));
      }
    }

    return Array.from(byApplicationId.values());
  }

  async listLatestOffersByApplicationIds(
    applicationIds: string[]
  ): Promise<ApplicationOfferRecord[]> {
    if (applicationIds.length === 0) {
      return [];
    }

    const records = await this.prismaClient.jobOffer.findMany({
      orderBy: [{ createdAt: 'desc' }],
      where: {
        applicationId: {
          in: applicationIds
        },
        deletedAt: null
      }
    });
    const byApplicationId = new Map<string, ApplicationOfferRecord>();

    for (const record of records) {
      if (!byApplicationId.has(record.applicationId)) {
        byApplicationId.set(record.applicationId, mapOfferRecord(record));
      }
    }

    return Array.from(byApplicationId.values());
  }

  async listJobApplications(
    filter: ListJobApplicationsFilter
  ): Promise<{ items: ApplicationRecord[]; total: number }> {
    const where = {
      employerIdentityId: filter.employerIdentityId,
      jobId: filter.jobId,
      ...(filter.status ? { status: filter.status } : {})
    };

    const [items, total] = await Promise.all([
      this.prismaClient.application.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        where
      }),
      this.prismaClient.application.count({ where })
    ]);

    return {
      items: items.map(mapRecord),
      total
    };
  }

  async listCountsByJobIds(
    jobIds: string[]
  ): Promise<Array<{ count: number; jobId: string }>> {
    if (jobIds.length === 0) {
      return [];
    }

    const records = await this.prismaClient.application.findMany({
      where: {
        jobId: {
          in: jobIds
        }
      }
    });
    const countMap = new Map<string, number>();

    for (const record of records) {
      const previousCount = countMap.get(record.jobId) ?? 0;
      countMap.set(record.jobId, previousCount + 1);
    }

    return Array.from(countMap.entries()).map(([jobId, count]) => ({
      count,
      jobId
    }));
  }

  async updateStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<ApplicationRecord | null> {
    const result = await this.prismaClient.application.updateMany({
      data: {
        status,
        updatedAt: new Date()
      },
      where: {
        id: applicationId
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(applicationId);
  }

  async transitionStatusWithHistory(
    data: TransitionApplicationStatusWithHistoryData
  ): Promise<ApplicationRecord | null> {
    const work = async (client: ApplicationPrismaRepositoryClient) => {
      const result = await client.application.updateMany({
        data: {
          status: data.status,
          updatedAt: new Date()
        },
        where: {
          id: data.applicationId,
          status: data.expectedStatus
        }
      });

      if (result.count === 0) {
        return null;
      }

      await client.applicationHistory.create({
        data: {
          actorIdentityId: data.history.actorIdentityId,
          actorType: data.history.actorType,
          applicationId: data.history.applicationId,
          eventType: data.history.eventType,
          fromStatus: data.history.fromStatus,
          id: data.history.id,
          note: data.history.note,
          toStatus: data.history.toStatus
        }
      });

      return client.application.findUnique({
        where: { id: data.applicationId }
      });
    };

    const record = hasPrismaTransaction(this.prismaClient)
      ? await this.prismaClient.$transaction(work)
      : await work(this.prismaClient);

    return record ? mapRecord(record) : null;
  }

  async countByEmployer(employerIdentityId: string): Promise<number> {
    return this.prismaClient.application.count({
      where: { employerIdentityId }
    });
  }

  async listEmployerDashboardPipeline(employerIdentityId: string, limit: number) {
    const records = await this.prismaClient.application.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      where: { employerIdentityId }
    });

    return records.map((record) => ({
      applicationId: record.id,
      appliedAt: record.createdAt,
      candidateIdentityId: record.candidateIdentityId,
      jobId: record.jobId,
      status: record.status as ApplicationStatus,
      updatedAt: record.updatedAt
    }));
  }

  async listEmployerDashboardRecentActivities(employerIdentityId: string, limit: number) {
    const applications = await this.prismaClient.application.findMany({
      where: { employerIdentityId }
    });
    const applicationLookup = new Map(
      applications.map((application) => [application.id, application])
    );
    const applicationIds = applications.map((application) => application.id);

    if (applicationIds.length === 0) {
      return [];
    }

    const records = await this.prismaClient.applicationHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      where: {
        applicationId: {
          in: applicationIds
        }
      }
    });

    return records.map((record) => {
      const application = applicationLookup.get(record.applicationId);

      return {
        applicationId: record.applicationId,
        candidateIdentityId: application?.candidateIdentityId ?? '',
        createdAt: record.createdAt,
        eventType: record.eventType,
        id: record.id,
        jobId: application?.jobId ?? '',
        newStatus: record.toStatus,
        note: record.note,
        oldStatus: record.fromStatus
      };
    });
  }

  async listRecruiterNotesByApplication(applicationId: string) {
    const records = await this.prismaClient.recruiterNote.findMany({
      orderBy: { createdAt: 'desc' },
      where: { applicationId }
    });

    return records.map((record) => ({
      applicationId: record.applicationId,
      authorIdentityId: record.authorIdentityId,
      body: record.body,
      createdAt: record.createdAt,
      id: record.id,
      updatedAt: record.updatedAt
    }));
  }

  async findRecruiterNoteById(noteId: string) {
    const record = await this.prismaClient.recruiterNote.findFirst({
      where: { id: noteId }
    });

    if (!record) {
      return null;
    }

    return {
      applicationId: record.applicationId,
      authorIdentityId: record.authorIdentityId,
      body: record.body,
      createdAt: record.createdAt,
      id: record.id,
      updatedAt: record.updatedAt
    };
  }

  async createRecruiterNote(data: {
    applicationId: string;
    authorIdentityId: string;
    body: string;
    id: string;
  }) {
    const record = await this.prismaClient.recruiterNote.create({
      data: {
        applicationId: data.applicationId,
        authorIdentityId: data.authorIdentityId,
        body: data.body,
        id: data.id
      }
    });

    return {
      applicationId: record.applicationId,
      authorIdentityId: record.authorIdentityId,
      body: record.body,
      createdAt: record.createdAt,
      id: record.id,
      updatedAt: record.updatedAt
    };
  }

  async updateRecruiterNote(noteId: string, body: string) {
    const result = await this.prismaClient.recruiterNote.updateMany({
      data: { body, updatedAt: new Date() },
      where: { id: noteId }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findRecruiterNoteById(noteId);
  }

  async deleteRecruiterNote(noteId: string): Promise<boolean> {
    const result = await this.prismaClient.recruiterNote.deleteMany({
      where: { id: noteId }
    });

    return result.count > 0;
  }
}
