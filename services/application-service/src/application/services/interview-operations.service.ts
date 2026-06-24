import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import {
  INTERVIEW_CHANGED_EVENT_NAME,
  createIntegrationEvent
} from '@careerhub/contracts';
import { InterviewApplicationStateInvalidError } from '../errors/interview-application-state-invalid.error';
import { InterviewNotFoundError } from '../errors/interview-not-found.error';
import { InterviewResponseStateInvalidError } from '../errors/interview-response-state-invalid.error';
import { InterviewStateInvalidError } from '../errors/interview-state-invalid.error';
import { ApplicationNotificationEventFactory } from '../notifications/application-notification-event.factory';
import { ApplicationMailEventFactory } from '../mail/application-mail-event.factory';
import { persistMailOutbox, persistNotificationOutbox } from '../outbox/application-outbox-event.mapper';
import type {
  ApplicationInterviewRecord,
  ApplicationRepository,
  ApplicationStatus,
  ApplicationWriteTransaction,
  IdGenerator,
  ListEmployerInterviewsFilters,
  PaginatedInterviewListResult,
  RecruitmentRepository
} from '../ports';
import {
  hasInterviewSlotChange,
  normalizeDecimal,
  normalizeInterviewSchedule,
  normalizeInterviewType,
  normalizeInterviewers,
  normalizeNullableString,
  normalizeRequiredString,
  pickNullableString,
  toDateOnly,
  toTimeOnly
} from './interview-schedule.utils';
import {
  ApplicationStatus as ApplicationStatusVO,
  InterviewStatus as InterviewStatusVO
} from '../../domain';

export type CreateInterviewInput = {
  callerInfo?: string | null;
  contactInfo?: string | null;
  date?: string | null;
  durationMinutes?: number | null;
  fullAddress?: string | null;
  interviewers?: Array<{ name: string; role?: string | null }> | null;
  locationDetail?: string | null;
  locationLat?: string | number | null;
  locationLng?: string | number | null;
  logisticsNote?: string | null;
  mapLink?: string | null;
  meetingId?: string | null;
  meetingLink?: string | null;
  notesToCandidate?: string | null;
  officeName?: string | null;
  passcode?: string | null;
  phoneNumber?: string | null;
  platform?: string | null;
  round: string;
  startTime?: string | null;
  timezone?: string | null;
  type: string;
};

export type UpdateInterviewInput = Partial<CreateInterviewInput>;

export type CancelInterviewInput = {
  reason: string;
};

export type CandidateInterviewResponseInput = {
  candidateResponseNote?: string | null;
};

export type CandidateRescheduleRequestInput = CandidateInterviewResponseInput & {
  proposedDate: string;
  proposedDurationMinutes?: number | null;
  proposedStartTime: string;
  proposedTimezone?: string | null;
};

function lifecycleHistoryStatus(status: ApplicationStatus): {
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
} {
  return {
    fromStatus: status,
    toStatus: status
  };
}

function buildInterviewChangedEvent(
  interview: ApplicationInterviewRecord,
  requestId?: string
) {
  return createIntegrationEvent(
    INTERVIEW_CHANGED_EVENT_NAME,
    {
      applicationId: interview.applicationId,
      candidateIdentityId: interview.candidateIdentityId,
      employerIdentityId: interview.employerIdentityId,
      interviewId: interview.id,
      jobId: interview.jobId,
      status: interview.status
    },
    requestId
  );
}

function normalizeInterviewListFilter(value?: string) {
  const normalized = value?.trim();
  if (!normalized || normalized === 'all') {
    return undefined;
  }

  return normalized;
}

export class InterviewOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly recruitmentRepository: RecruitmentRepository,
    private readonly writeTransaction: ApplicationWriteTransaction,
    private readonly notificationEventFactory: ApplicationNotificationEventFactory,
    private readonly mailEventFactory: ApplicationMailEventFactory,
    private readonly idGenerator: IdGenerator
  ) {}

  async listEmployerInterviews(employerIdentityId: string): Promise<ApplicationInterviewRecord[]> {
    return this.recruitmentRepository.listEmployerInterviews(employerIdentityId.trim());
  }

  async listEmployerInterviewsPage(input: {
    employerIdentityId: string;
    status?: string;
    type?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedInterviewListResult> {
    const filters: ListEmployerInterviewsFilters = {
      date: input.date?.trim() || undefined,
      dateFrom: input.dateFrom?.trim() || undefined,
      dateTo: input.dateTo?.trim() || undefined,
      page: input.page,
      pageSize: input.pageSize,
      status: normalizeInterviewListFilter(input.status),
      type: normalizeInterviewListFilter(input.type)
    };

    return this.recruitmentRepository.listEmployerInterviewsPage(
      input.employerIdentityId.trim(),
      filters
    );
  }

  async createInterview(
    employerIdentityId: string,
    applicationId: string,
    input: CreateInterviewInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const application = await this.applicationRepository.findByIdAndEmployer(
      applicationId.trim(),
      employerIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (new ApplicationStatusVO(application.status).isTerminal()) {
      throw new InterviewApplicationStateInvalidError();
    }

    const schedule = normalizeInterviewSchedule(input);
    const normalizedEmployerIdentityId = employerIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      if (application.status !== 'interview') {
        await context.applicationRepository.updateStatus(application.id, 'interview');
        await context.applicationRepository.createHistory({
          actorIdentityId: normalizedEmployerIdentityId,
          actorType: 'employer',
          applicationId: application.id,
          eventType: 'status_change',
          fromStatus: application.status,
          id: this.idGenerator.generate(),
          note: 'Application moved to interview stage automatically when the first interview was scheduled.',
          toStatus: 'interview'
        });
      }

      const interview = await context.recruitmentRepository.createInterview({
        applicationId: application.id,
        callerInfo: normalizeNullableString(input.callerInfo),
        candidateIdentityId: application.candidateIdentityId,
        contactInfo: normalizeNullableString(input.contactInfo),
        date: schedule.date,
        durationMinutes: schedule.durationMinutes,
        employerIdentityId: application.employerIdentityId,
        endTime: schedule.endTime,
        fullAddress: normalizeNullableString(input.fullAddress),
        id: this.idGenerator.generate(),
        interviewers: normalizeInterviewers(input.interviewers),
        jobId: application.jobId,
        locationDetail: normalizeNullableString(input.locationDetail),
        locationLat: normalizeDecimal(input.locationLat),
        locationLng: normalizeDecimal(input.locationLng),
        logisticsNote: normalizeNullableString(input.logisticsNote),
        mapLink: normalizeNullableString(input.mapLink),
        meetingId: normalizeNullableString(input.meetingId),
        meetingLink: normalizeNullableString(input.meetingLink),
        notesToCandidate: normalizeNullableString(input.notesToCandidate),
        officeName: normalizeNullableString(input.officeName),
        passcode: normalizeNullableString(input.passcode),
        phoneNumber: normalizeNullableString(input.phoneNumber),
        platform: normalizeNullableString(input.platform),
        round: normalizeRequiredString(input.round, 'Interview round is required.'),
        scheduledByIdentityId: normalizedEmployerIdentityId,
        startTime: schedule.startTime,
        status: InterviewStatusVO.scheduled().value,
        timezone: normalizeNullableString(input.timezone),
        type: normalizeInterviewType(input.type)
      });

      const historyStatus = lifecycleHistoryStatus('interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: application.id,
        eventType: 'interview_scheduled',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: 'Employer scheduled the first interview.',
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildInterviewScheduledEvent({
        actorIdentityId: normalizedEmployerIdentityId,
        interview,
        requestId: input.requestId
      });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      const mailEvent = await this.mailEventFactory.buildInterviewCreatedMailEvent({
        interview,
        requestId: input.requestId
      });

      if (mailEvent) {
        await persistMailOutbox(context.outboxRepository, mailEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(interview, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return interview;
    });
  }

  async updateInterview(
    employerIdentityId: string,
    interviewId: string,
    input: UpdateInterviewInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndEmployer(
      interviewId.trim(),
      employerIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureEmployerMutable(interview.status);

    const updatedSchedule = normalizeInterviewSchedule(input, interview);
    const slotChanged = hasInterviewSlotChange(interview, input, updatedSchedule);
    const normalizedEmployerIdentityId = employerIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateInterviewIfStatus(
        interview.id,
        [interview.status],
        {
        callerInfo: pickNullableString(input.callerInfo, interview.callerInfo),
        candidateProposedDate: slotChanged ? null : interview.candidateProposedDate,
        candidateProposedDurationMinutes: slotChanged
          ? null
          : interview.candidateProposedDurationMinutes,
        candidateProposedStartTime: slotChanged ? null : interview.candidateProposedStartTime,
        candidateProposedTimezone: slotChanged ? null : interview.candidateProposedTimezone,
        contactInfo: pickNullableString(input.contactInfo, interview.contactInfo),
        date: updatedSchedule.date,
        durationMinutes: updatedSchedule.durationMinutes,
        endTime: updatedSchedule.endTime,
        fullAddress: pickNullableString(input.fullAddress, interview.fullAddress),
        interviewers:
          input.interviewers === undefined
            ? interview.interviewers
            : normalizeInterviewers(input.interviewers),
        locationDetail: pickNullableString(input.locationDetail, interview.locationDetail),
        locationLat:
          input.locationLat === undefined
            ? interview.locationLat
            : normalizeDecimal(input.locationLat),
        locationLng:
          input.locationLng === undefined
            ? interview.locationLng
            : normalizeDecimal(input.locationLng),
        logisticsNote: pickNullableString(input.logisticsNote, interview.logisticsNote),
        mapLink: pickNullableString(input.mapLink, interview.mapLink),
        meetingId: pickNullableString(input.meetingId, interview.meetingId),
        meetingLink: pickNullableString(input.meetingLink, interview.meetingLink),
        notesToCandidate: pickNullableString(input.notesToCandidate, interview.notesToCandidate),
        officeName: pickNullableString(input.officeName, interview.officeName),
        passcode: pickNullableString(input.passcode, interview.passcode),
        phoneNumber: pickNullableString(input.phoneNumber, interview.phoneNumber),
        platform: pickNullableString(input.platform, interview.platform),
        round:
          input.round === undefined
            ? interview.round
            : normalizeRequiredString(input.round, 'Interview round is required.'),
        startTime: updatedSchedule.startTime,
        status: slotChanged ? InterviewStatusVO.rescheduled().value : interview.status,
        timezone: pickNullableString(input.timezone, interview.timezone),
        type: input.type === undefined ? interview.type : normalizeInterviewType(input.type)
      });

      if (!updated) {
        throw new InterviewStateInvalidError();
      }

      const application = await context.applicationRepository.findById(interview.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: interview.applicationId,
        eventType: 'interview_status_changed',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: slotChanged
          ? 'Employer rescheduled the interview.'
          : 'Employer updated interview details.',
        toStatus: historyStatus.toStatus
      });

      const notificationEvent =
        this.notificationEventFactory.buildInterviewStatusChangedEvent({
          action: 'updated',
          actorIdentityId: normalizedEmployerIdentityId,
          interview: updated,
          recipientRole: 'candidate',
          requestId: input.requestId
        });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      if (slotChanged) {
        const mailEvent = await this.mailEventFactory.buildInterviewUpdatedMailEvent({
          interview: updated,
          requestId: input.requestId
        });

        if (mailEvent) {
          await persistMailOutbox(context.outboxRepository, mailEvent, {
            createOutboxId: () => this.idGenerator.generate()
          });
        }
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(updated, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return updated;
    });
  }

  async cancelInterview(
    employerIdentityId: string,
    interviewId: string,
    input: CancelInterviewInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndEmployer(
      interviewId.trim(),
      employerIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureEmployerMutable(interview.status);
    const normalizedEmployerIdentityId = employerIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateInterviewIfStatus(
        interview.id,
        [interview.status],
        {
        candidateResponseNote: normalizeNullableString(input.reason),
        status: InterviewStatusVO.cancelled().value
      });

      if (!updated) {
        throw new InterviewStateInvalidError();
      }

      const application = await context.applicationRepository.findById(interview.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: interview.applicationId,
        eventType: 'interview_status_changed',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Employer cancelled the interview. Reason: ${input.reason.trim()}`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent =
        this.notificationEventFactory.buildInterviewStatusChangedEvent({
          action: 'cancelled',
          actorIdentityId: normalizedEmployerIdentityId,
          interview: updated,
          recipientRole: 'candidate',
          requestId: input.requestId
        });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      const mailEvent = await this.mailEventFactory.buildInterviewCancelledMailEvent({
        interview: updated,
        requestId: input.requestId
      });

      if (mailEvent) {
        await persistMailOutbox(context.outboxRepository, mailEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(updated, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return updated;
    });
  }

  async getCandidateInterview(
    candidateIdentityId: string,
    applicationId: string
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByApplicationAndCandidate(
      applicationId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError();
    }

    return interview;
  }

  async confirmInterview(
    candidateIdentityId: string,
    interviewId: string,
    input: CandidateInterviewResponseInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);
    const normalizedCandidateIdentityId = candidateIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateInterviewIfStatus(
        interview.id,
        [interview.status],
        {
        candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
        status: InterviewStatusVO.confirmed().value
      });

      if (!updated) {
        throw new InterviewResponseStateInvalidError();
      }

      const application = await context.applicationRepository.findById(interview.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: interview.applicationId,
        eventType: 'interview_status_changed',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: 'Candidate confirmed interview attendance.',
        toStatus: historyStatus.toStatus
      });

      const notificationEvent =
        this.notificationEventFactory.buildInterviewStatusChangedEvent({
          action: 'confirmed',
          actorIdentityId: normalizedCandidateIdentityId,
          interview: updated,
          recipientRole: 'employer',
          requestId: input.requestId
        });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(updated, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return updated;
    });
  }

  async declineInterview(
    candidateIdentityId: string,
    interviewId: string,
    input: CandidateInterviewResponseInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);
    const normalizedCandidateIdentityId = candidateIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateInterviewIfStatus(
        interview.id,
        [interview.status],
        {
        candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
        status: InterviewStatusVO.cancelled().value
      });

      if (!updated) {
        throw new InterviewResponseStateInvalidError();
      }

      const application = await context.applicationRepository.findById(interview.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: interview.applicationId,
        eventType: 'interview_status_changed',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: 'Candidate declined the interview.',
        toStatus: historyStatus.toStatus
      });

      const notificationEvent =
        this.notificationEventFactory.buildInterviewStatusChangedEvent({
          action: 'declined',
          actorIdentityId: normalizedCandidateIdentityId,
          interview: updated,
          recipientRole: 'employer',
          requestId: input.requestId
        });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(updated, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return updated;
    });
  }

  async requestReschedule(
    candidateIdentityId: string,
    interviewId: string,
    input: CandidateRescheduleRequestInput & { requestId?: string }
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);
    const normalizedCandidateIdentityId = candidateIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateInterviewIfStatus(
        interview.id,
        [interview.status],
        {
        candidateProposedDate: toDateOnly(input.proposedDate),
        candidateProposedDurationMinutes: input.proposedDurationMinutes ?? null,
        candidateProposedStartTime: toTimeOnly(input.proposedStartTime),
        candidateProposedTimezone: normalizeNullableString(input.proposedTimezone),
        candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
        status: InterviewStatusVO.rescheduled().value
      });

      if (!updated) {
        throw new InterviewResponseStateInvalidError();
      }

      const application = await context.applicationRepository.findById(interview.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: interview.applicationId,
        eventType: 'interview_status_changed',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: 'Candidate requested interview reschedule.',
        toStatus: historyStatus.toStatus
      });

      const notificationEvent =
        this.notificationEventFactory.buildInterviewStatusChangedEvent({
          action: 'requested_reschedule',
          actorIdentityId: normalizedCandidateIdentityId,
          interview: updated,
          recipientRole: 'employer',
          requestId: input.requestId
        });

      if (notificationEvent) {
        await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
          createOutboxId: () => this.idGenerator.generate()
        });
      }

      await persistNotificationOutbox(
        context.outboxRepository,
        buildInterviewChangedEvent(updated, input.requestId),
        {
          createOutboxId: () => this.idGenerator.generate()
        }
      );

      return updated;
    });
  }

  private ensureEmployerMutable(status: string): void {
    if (!new InterviewStatusVO(status).canEmployerMutate()) {
      throw new InterviewStateInvalidError();
    }
  }

  private ensureCandidateRespondable(status: string): void {
    if (!new InterviewStatusVO(status).canCandidateRespond()) {
      throw new InterviewResponseStateInvalidError();
    }
  }
}
