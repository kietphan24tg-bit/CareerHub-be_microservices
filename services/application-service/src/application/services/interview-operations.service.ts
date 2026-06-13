import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { InterviewApplicationStateInvalidError } from '../errors/interview-application-state-invalid.error';
import { InterviewNotFoundError } from '../errors/interview-not-found.error';
import { InterviewResponseStateInvalidError } from '../errors/interview-response-state-invalid.error';
import { InterviewStateInvalidError } from '../errors/interview-state-invalid.error';
import type {
  ApplicationInterviewRecord,
  ApplicationRepository,
  ApplicationStatus,
  IdGenerator,
  RecruitmentRepository
} from '../ports';
import {
  CANDIDATE_RESPONDABLE_INTERVIEW_STATUSES,
  EMPLOYER_MUTABLE_INTERVIEW_STATUSES,
  INTERVIEW_STATUS,
  TERMINAL_APPLICATION_STATUSES,
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

export class InterviewOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly recruitmentRepository: RecruitmentRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async listEmployerInterviews(employerIdentityId: string): Promise<ApplicationInterviewRecord[]> {
    return this.recruitmentRepository.listEmployerInterviews(employerIdentityId.trim());
  }

  async createInterview(
    employerIdentityId: string,
    applicationId: string,
    input: CreateInterviewInput
  ): Promise<ApplicationInterviewRecord> {
    const application = await this.applicationRepository.findByIdAndEmployer(
      applicationId.trim(),
      employerIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (TERMINAL_APPLICATION_STATUSES.has(application.status)) {
      throw new InterviewApplicationStateInvalidError();
    }

    const schedule = normalizeInterviewSchedule(input);

    if (application.status !== 'interview') {
      await this.applicationRepository.updateStatus(application.id, 'interview');
      await this.applicationRepository.createHistory({
        actorIdentityId: employerIdentityId.trim(),
        actorType: 'employer',
        applicationId: application.id,
        eventType: 'status_change',
        fromStatus: application.status,
        id: this.idGenerator.generate(),
        note: 'Application moved to interview stage automatically when the first interview was scheduled.',
        toStatus: 'interview'
      });
    }

    const interview = await this.recruitmentRepository.createInterview({
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
      scheduledByIdentityId: employerIdentityId.trim(),
      startTime: schedule.startTime,
      status: INTERVIEW_STATUS.scheduled,
      timezone: normalizeNullableString(input.timezone),
      type: normalizeInterviewType(input.type)
    });

    const historyStatus = lifecycleHistoryStatus(
      application.status === 'interview' ? 'interview' : 'interview'
    );
    await this.applicationRepository.createHistory({
      actorIdentityId: employerIdentityId.trim(),
      actorType: 'employer',
      applicationId: application.id,
      eventType: 'interview_scheduled',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: 'Employer scheduled the first interview.',
      toStatus: historyStatus.toStatus
    });

    return interview;
  }

  async updateInterview(
    employerIdentityId: string,
    interviewId: string,
    input: UpdateInterviewInput
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

    const updated = await this.recruitmentRepository.updateInterview(interview.id, {
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
      status: slotChanged ? INTERVIEW_STATUS.rescheduled : interview.status,
      timezone: pickNullableString(input.timezone, interview.timezone),
      type: input.type === undefined ? interview.type : normalizeInterviewType(input.type)
    });

    if (!updated) {
      throw new InterviewNotFoundError(interviewId);
    }

    const application = await this.applicationRepository.findById(interview.applicationId);
    const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
    await this.applicationRepository.createHistory({
      actorIdentityId: employerIdentityId.trim(),
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

    return updated;
  }

  async cancelInterview(
    employerIdentityId: string,
    interviewId: string,
    input: CancelInterviewInput
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndEmployer(
      interviewId.trim(),
      employerIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureEmployerMutable(interview.status);

    const updated = await this.recruitmentRepository.updateInterview(interview.id, {
      candidateResponseNote: normalizeNullableString(input.reason),
      status: INTERVIEW_STATUS.cancelled
    });

    if (!updated) {
      throw new InterviewNotFoundError(interviewId);
    }

    const application = await this.applicationRepository.findById(interview.applicationId);
    const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
    await this.applicationRepository.createHistory({
      actorIdentityId: employerIdentityId.trim(),
      actorType: 'employer',
      applicationId: interview.applicationId,
      eventType: 'interview_status_changed',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: `Employer cancelled the interview. Reason: ${input.reason.trim()}`,
      toStatus: historyStatus.toStatus
    });

    return updated;
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
    input: CandidateInterviewResponseInput
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);

    const updated = await this.recruitmentRepository.updateInterview(interview.id, {
      candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
      status: INTERVIEW_STATUS.confirmed
    });

    if (!updated) {
      throw new InterviewNotFoundError(interviewId);
    }

    const application = await this.applicationRepository.findById(interview.applicationId);
    const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
    await this.applicationRepository.createHistory({
      actorIdentityId: candidateIdentityId.trim(),
      actorType: 'candidate',
      applicationId: interview.applicationId,
      eventType: 'interview_status_changed',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: 'Candidate confirmed interview attendance.',
      toStatus: historyStatus.toStatus
    });

    return updated;
  }

  async declineInterview(
    candidateIdentityId: string,
    interviewId: string,
    input: CandidateInterviewResponseInput
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);

    const updated = await this.recruitmentRepository.updateInterview(interview.id, {
      candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
      status: INTERVIEW_STATUS.cancelled
    });

    if (!updated) {
      throw new InterviewNotFoundError(interviewId);
    }

    const application = await this.applicationRepository.findById(interview.applicationId);
    const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
    await this.applicationRepository.createHistory({
      actorIdentityId: candidateIdentityId.trim(),
      actorType: 'candidate',
      applicationId: interview.applicationId,
      eventType: 'interview_status_changed',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: 'Candidate declined the interview.',
      toStatus: historyStatus.toStatus
    });

    return updated;
  }

  async requestReschedule(
    candidateIdentityId: string,
    interviewId: string,
    input: CandidateRescheduleRequestInput
  ): Promise<ApplicationInterviewRecord> {
    const interview = await this.recruitmentRepository.findInterviewByIdAndCandidate(
      interviewId.trim(),
      candidateIdentityId.trim()
    );

    if (!interview) {
      throw new InterviewNotFoundError(interviewId);
    }

    this.ensureCandidateRespondable(interview.status);

    const updated = await this.recruitmentRepository.updateInterview(interview.id, {
      candidateProposedDate: toDateOnly(input.proposedDate),
      candidateProposedDurationMinutes: input.proposedDurationMinutes ?? null,
      candidateProposedStartTime: toTimeOnly(input.proposedStartTime),
      candidateProposedTimezone: normalizeNullableString(input.proposedTimezone),
      candidateResponseNote: normalizeNullableString(input.candidateResponseNote),
      status: INTERVIEW_STATUS.rescheduled
    });

    if (!updated) {
      throw new InterviewNotFoundError(interviewId);
    }

    const application = await this.applicationRepository.findById(interview.applicationId);
    const historyStatus = lifecycleHistoryStatus(application?.status ?? 'interview');
    await this.applicationRepository.createHistory({
      actorIdentityId: candidateIdentityId.trim(),
      actorType: 'candidate',
      applicationId: interview.applicationId,
      eventType: 'interview_status_changed',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: 'Candidate requested interview reschedule.',
      toStatus: historyStatus.toStatus
    });

    return updated;
  }

  private ensureEmployerMutable(status: string): void {
    if (!EMPLOYER_MUTABLE_INTERVIEW_STATUSES.has(status)) {
      throw new InterviewStateInvalidError();
    }
  }

  private ensureCandidateRespondable(status: string): void {
    if (!CANDIDATE_RESPONDABLE_INTERVIEW_STATUSES.has(status)) {
      throw new InterviewResponseStateInvalidError();
    }
  }
}
