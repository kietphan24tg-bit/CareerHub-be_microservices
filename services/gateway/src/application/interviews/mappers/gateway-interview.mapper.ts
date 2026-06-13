import type {
  CreateInterviewInputMessage,
  InterviewDetailMessage,
  UpdateInterviewInputMessage
} from '@careerhub/contracts';
import type {
  CancelInterviewRequestDto,
  CandidateInterviewResponseRequestDto,
  CandidateRescheduleRequestDto,
  CreateInterviewRequestDto,
  UpdateInterviewRequestDto
} from '../../../presentation/http/interviews/dto/interview-write.request.dto';
import type { GatewayJobSummary } from '../../saved-jobs/ports/job-lookup.port';

function nullableString(
  value: string | undefined,
  nullFields?: string[],
  field?: string
): string | null {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === '') {
    return null;
  }

  return value;
}

function nullableNumber(value: number | undefined, nullFields?: string[], field?: string) {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === 0) {
    return null;
  }

  return value;
}

export type GatewayHttpInterviewDetail = {
  applicationId: string;
  candidateProposal: {
    proposedDate: string | null;
    proposedDurationMinutes: number | null;
    proposedStartTime: string | null;
    proposedTimezone: string | null;
  };
  candidateResponseNote: string | null;
  candidateUserId: string;
  callerInfo: string | null;
  company: {
    companyName: string;
    id: string;
    logoUrl: string | null;
  };
  companyId: string;
  contactInfo: string | null;
  createdAt: string;
  date: string | null;
  durationMinutes: number | null;
  endTime: string | null;
  fullAddress: string | null;
  id: string;
  interviewers: Array<{ name: string; role: string | null }>;
  job: {
    id: string;
    title: string;
  };
  jobId: string;
  locationDetail: string | null;
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
  scheduledByUserId: string;
  startTime: string | null;
  status: string;
  timezone: string | null;
  type: string;
  updatedAt: string;
};

export type GatewayHttpEmployerInterviewListItem = {
  applicationId: string;
  candidate: {
    avatarUrl: string | null;
    fullName: string;
    headline: string | null;
    id: string;
  };
  candidateUserId: string;
  company: {
    companyName: string;
    id: string;
    logoUrl: string | null;
  };
  companyId: string;
  date: string | null;
  durationMinutes: number | null;
  endTime: string | null;
  fullAddress: string | null;
  id: string;
  interviewers: Array<{ name: string; role: string | null }>;
  job: {
    id: string;
    title: string;
  };
  jobId: string;
  locationDetail: string | null;
  meetingLink: string | null;
  platform: string | null;
  round: string;
  startTime: string | null;
  status: string;
  timezone: string | null;
  type: string;
};

export function toGrpcCreateInterviewInput(dto: CreateInterviewRequestDto): CreateInterviewInputMessage {
  return {
    caller_info: dto.callerInfo ?? undefined,
    contact_info: dto.contactInfo ?? undefined,
    date: dto.date,
    duration_minutes: dto.durationMinutes,
    full_address: dto.fullAddress ?? undefined,
    interviewers: dto.interviewers?.map((interviewer) => ({
      name: interviewer.name,
      role: interviewer.role ?? ''
    })),
    location_detail: dto.locationDetail ?? undefined,
    location_lat: dto.locationLat === null || dto.locationLat === undefined ? undefined : String(dto.locationLat),
    location_lng: dto.locationLng === null || dto.locationLng === undefined ? undefined : String(dto.locationLng),
    logistics_note: dto.logisticsNote ?? undefined,
    map_link: dto.mapLink ?? undefined,
    meeting_id: dto.meetingId ?? undefined,
    meeting_link: dto.meetingLink ?? undefined,
    notes_to_candidate: dto.notesToCandidate ?? undefined,
    office_name: dto.officeName ?? undefined,
    passcode: dto.passcode ?? undefined,
    phone_number: dto.phoneNumber ?? undefined,
    platform: dto.platform ?? undefined,
    round: dto.round,
    start_time: dto.startTime,
    timezone: dto.timezone ?? undefined,
    type: dto.type
  };
}

export function toGrpcUpdateInterviewInput(dto: UpdateInterviewRequestDto): UpdateInterviewInputMessage {
  const input: UpdateInterviewInputMessage = {};

  if (dto.type !== undefined) input.type = dto.type;
  if (dto.round !== undefined) input.round = dto.round;
  if (dto.date !== undefined) input.date = dto.date;
  if (dto.startTime !== undefined) input.start_time = dto.startTime;
  if (dto.durationMinutes !== undefined) input.duration_minutes = dto.durationMinutes;
  if (dto.timezone !== undefined) input.timezone = dto.timezone ?? '';
  if (dto.notesToCandidate !== undefined) input.notes_to_candidate = dto.notesToCandidate ?? '';
  if (dto.logisticsNote !== undefined) input.logistics_note = dto.logisticsNote ?? '';
  if (dto.interviewers !== undefined) {
    input.interviewers = dto.interviewers.map((interviewer) => ({
      name: interviewer.name,
      role: interviewer.role ?? ''
    }));
  }
  if (dto.platform !== undefined) input.platform = dto.platform ?? '';
  if (dto.meetingLink !== undefined) input.meeting_link = dto.meetingLink ?? '';
  if (dto.meetingId !== undefined) input.meeting_id = dto.meetingId ?? '';
  if (dto.passcode !== undefined) input.passcode = dto.passcode ?? '';
  if (dto.officeName !== undefined) input.office_name = dto.officeName ?? '';
  if (dto.fullAddress !== undefined) input.full_address = dto.fullAddress ?? '';
  if (dto.locationDetail !== undefined) input.location_detail = dto.locationDetail ?? '';
  if (dto.locationLat !== undefined) {
    input.location_lat = dto.locationLat === null ? '' : String(dto.locationLat);
  }
  if (dto.locationLng !== undefined) {
    input.location_lng = dto.locationLng === null ? '' : String(dto.locationLng);
  }
  if (dto.mapLink !== undefined) input.map_link = dto.mapLink ?? '';
  if (dto.callerInfo !== undefined) input.caller_info = dto.callerInfo ?? '';
  if (dto.contactInfo !== undefined) input.contact_info = dto.contactInfo ?? '';
  if (dto.phoneNumber !== undefined) input.phone_number = dto.phoneNumber ?? '';

  return input;
}

export function toGatewayHttpInterviewDetail(input: {
  company?: {
    companyName: string;
    id: string;
    logoUrl: string | null;
  } | null;
  interview: InterviewDetailMessage;
  job?: GatewayJobSummary | null;
}): GatewayHttpInterviewDetail {
  const interview = input.interview;
  const nullFields = interview.null_fields ?? [];

  return {
    applicationId: interview.application_id,
    candidateProposal: {
      proposedDate: nullableString(interview.candidate_proposed_date, nullFields, 'candidate_proposed_date'),
      proposedDurationMinutes: nullableNumber(
        interview.candidate_proposed_duration_minutes,
        nullFields,
        'candidate_proposed_duration_minutes'
      ),
      proposedStartTime: nullableString(
        interview.candidate_proposed_start_time,
        nullFields,
        'candidate_proposed_start_time'
      ),
      proposedTimezone: nullableString(
        interview.candidate_proposed_timezone,
        nullFields,
        'candidate_proposed_timezone'
      )
    },
    candidateResponseNote: nullableString(interview.candidate_response_note, nullFields, 'candidate_response_note'),
    candidateUserId: interview.candidate_identity_id ?? '',
    callerInfo: nullableString(interview.caller_info, nullFields, 'caller_info'),
    company: {
      companyName: input.company?.companyName ?? '',
      id: input.company?.id ?? interview.employer_identity_id ?? '',
      logoUrl: input.company?.logoUrl ?? null
    },
    companyId: interview.employer_identity_id ?? '',
    contactInfo: nullableString(interview.contact_info, nullFields, 'contact_info'),
    createdAt: interview.created_at,
    date: nullableString(interview.date, nullFields, 'date'),
    durationMinutes: nullableNumber(interview.duration_minutes, nullFields, 'duration_minutes'),
    endTime: nullableString(interview.end_time, nullFields, 'end_time'),
    fullAddress: nullableString(interview.full_address, nullFields, 'full_address'),
    id: interview.id,
    interviewers: (interview.interviewers ?? []).map((interviewer) => ({
      name: interviewer.name,
      role: nullableString(interviewer.role)
    })),
    job: {
      id: interview.job_id ?? input.job?.id ?? '',
      title: input.job?.title ?? ''
    },
    jobId: interview.job_id ?? '',
    locationDetail: nullableString(interview.location_detail, nullFields, 'location_detail'),
    logisticsNote: nullableString(interview.logistics_note, nullFields, 'logistics_note'),
    mapLink: nullableString(interview.map_link, nullFields, 'map_link'),
    meetingId: nullableString(interview.meeting_id, nullFields, 'meeting_id'),
    meetingLink: nullableString(interview.meeting_link, nullFields, 'meeting_link'),
    notesToCandidate: nullableString(interview.notes_to_candidate, nullFields, 'notes_to_candidate'),
    officeName: nullableString(interview.office_name, nullFields, 'office_name'),
    passcode: nullableString(interview.passcode, nullFields, 'passcode'),
    phoneNumber: nullableString(interview.phone_number, nullFields, 'phone_number'),
    platform: nullableString(interview.platform, nullFields, 'platform'),
    round: interview.round,
    scheduledByUserId: interview.scheduled_by_identity_id ?? '',
    startTime: nullableString(interview.start_time, nullFields, 'start_time'),
    status: interview.status,
    timezone: nullableString(interview.timezone, nullFields, 'timezone'),
    type: interview.type,
    updatedAt: interview.updated_at
  };
}

export function toGatewayHttpEmployerInterviewListItem(input: {
  candidate?: {
    avatarUrl: string | null;
    fullName: string;
    headline: string | null;
    id: string;
  } | null;
  company?: {
    companyName: string;
    id: string;
    logoUrl: string | null;
  } | null;
  interview: InterviewDetailMessage;
  job?: GatewayJobSummary | null;
}): GatewayHttpEmployerInterviewListItem {
  const detail = toGatewayHttpInterviewDetail(input);

  return {
    applicationId: detail.applicationId,
    candidate: {
      avatarUrl: input.candidate?.avatarUrl ?? null,
      fullName: input.candidate?.fullName ?? '',
      headline: input.candidate?.headline ?? null,
      id: input.candidate?.id ?? detail.candidateUserId
    },
    candidateUserId: detail.candidateUserId,
    company: detail.company,
    companyId: detail.companyId,
    date: detail.date,
    durationMinutes: detail.durationMinutes,
    endTime: detail.endTime,
    fullAddress: detail.fullAddress,
    id: detail.id,
    interviewers: detail.interviewers,
    job: detail.job,
    jobId: detail.jobId,
    locationDetail: detail.locationDetail,
    meetingLink: detail.meetingLink,
    platform: detail.platform,
    round: detail.round,
    startTime: detail.startTime,
    status: detail.status,
    timezone: detail.timezone,
    type: detail.type
  };
}

export function toGrpcCandidateInterviewResponseInput(
  dto: CandidateInterviewResponseRequestDto
) {
  return {
    candidate_response_note: dto.candidateResponseNote ?? undefined
  };
}

export function toGrpcCandidateRescheduleInput(dto: CandidateRescheduleRequestDto) {
  return {
    candidate_response_note: dto.candidateResponseNote ?? undefined,
    proposed_date: dto.proposedDate,
    proposed_duration_minutes: dto.proposedDurationMinutes ?? undefined,
    proposed_start_time: dto.proposedStartTime,
    proposed_timezone: dto.proposedTimezone ?? undefined
  };
}

export function toGrpcCancelInterviewInput(dto: CancelInterviewRequestDto) {
  return {
    reason: dto.reason
  };
}
