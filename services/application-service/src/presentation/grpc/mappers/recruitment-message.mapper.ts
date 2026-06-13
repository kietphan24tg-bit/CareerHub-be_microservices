import type {
  BenefitCatalogMessage,
  CreateInterviewInputMessage,
  CreateOfferInputMessage,
  InterviewDetailMessage,
  InterviewerMessage,
  OfferBenefitInputMessage,
  OfferBenefitMessage,
  OfferDetailMessage,
  UpdateInterviewInputMessage,
  UpdateOfferInputMessage
} from '@careerhub/contracts';
import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  BenefitCatalogRecord
} from '../../../application';
import type {
  CreateInterviewInput,
  UpdateInterviewInput
} from '../../../application/services/interview-operations.service';
import type {
  CreateOfferInput,
  UpdateOfferInput
} from '../../../application/services/offer-operations.service';
import type { OfferBenefitInput } from '../../../application/services/offer-validation.utils';

function collectNullFields(pairs: Array<[string, unknown]>): string[] {
  return pairs
    .filter(([, value]) => value === null || value === undefined)
    .map(([field]) => field);
}

function optionalProtoString(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function optionalProtoNumber(value: number | undefined): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

export function toGrpcInterviewerMessage(input: {
  name: string;
  role: string | null;
}): InterviewerMessage {
  return {
    name: input.name,
    role: input.role ?? ''
  };
}

export function toGrpcInterviewDetailMessage(
  interview: ApplicationInterviewRecord
): InterviewDetailMessage {
  const nullFields = collectNullFields([
    ['date', interview.date],
    ['start_time', interview.startTime],
    ['end_time', interview.endTime],
    ['timezone', interview.timezone],
    ['duration_minutes', interview.durationMinutes],
    ['notes_to_candidate', interview.notesToCandidate],
    ['logistics_note', interview.logisticsNote],
    ['platform', interview.platform],
    ['meeting_link', interview.meetingLink],
    ['meeting_id', interview.meetingId],
    ['passcode', interview.passcode],
    ['office_name', interview.officeName],
    ['full_address', interview.fullAddress],
    ['location_detail', interview.locationDetail],
    ['location_lat', interview.locationLat],
    ['location_lng', interview.locationLng],
    ['map_link', interview.mapLink],
    ['caller_info', interview.callerInfo],
    ['contact_info', interview.contactInfo],
    ['phone_number', interview.phoneNumber],
    ['candidate_response_note', interview.candidateResponseNote],
    ['candidate_proposed_date', interview.candidateProposedDate],
    ['candidate_proposed_start_time', interview.candidateProposedStartTime],
    ['candidate_proposed_duration_minutes', interview.candidateProposedDurationMinutes],
    ['candidate_proposed_timezone', interview.candidateProposedTimezone]
  ]);

  return {
    application_id: interview.applicationId,
    caller_info: interview.callerInfo ?? '',
    candidate_identity_id: interview.candidateIdentityId,
    candidate_proposed_date: interview.candidateProposedDate ?? '',
    candidate_proposed_duration_minutes: interview.candidateProposedDurationMinutes ?? 0,
    candidate_proposed_start_time: interview.candidateProposedStartTime ?? '',
    candidate_proposed_timezone: interview.candidateProposedTimezone ?? '',
    candidate_response_note: interview.candidateResponseNote ?? '',
    contact_info: interview.contactInfo ?? '',
    created_at: interview.createdAt.toISOString(),
    date: interview.date ?? '',
    duration_minutes: interview.durationMinutes ?? 0,
    employer_identity_id: interview.employerIdentityId,
    end_time: interview.endTime ?? '',
    full_address: interview.fullAddress ?? '',
    id: interview.id,
    interviewers: interview.interviewers.map(toGrpcInterviewerMessage),
    job_id: interview.jobId,
    location_detail: interview.locationDetail ?? '',
    location_lat: interview.locationLat ?? '',
    location_lng: interview.locationLng ?? '',
    logistics_note: interview.logisticsNote ?? '',
    map_link: interview.mapLink ?? '',
    meeting_id: interview.meetingId ?? '',
    meeting_link: interview.meetingLink ?? '',
    notes_to_candidate: interview.notesToCandidate ?? '',
    null_fields: nullFields,
    office_name: interview.officeName ?? '',
    passcode: interview.passcode ?? '',
    phone_number: interview.phoneNumber ?? '',
    platform: interview.platform ?? '',
    round: interview.round,
    scheduled_by_identity_id: interview.scheduledByIdentityId,
    start_time: interview.startTime ?? '',
    status: interview.status,
    timezone: interview.timezone ?? '',
    type: interview.type,
    updated_at: interview.updatedAt.toISOString()
  } as unknown as InterviewDetailMessage;
}

export function toGrpcOfferBenefitMessage(
  benefit: ApplicationOfferRecord['benefits'][number]
): OfferBenefitMessage {
  const nullFields = collectNullFields([
    ['catalog_id', benefit.catalogId],
    ['name', benefit.name],
    ['description', benefit.description],
    ['amount', benefit.amount],
    ['currency', benefit.currency],
    ['frequency', benefit.frequency],
    ['annual_leave_days', benefit.annualLeaveDays]
  ]);

  return {
    amount: benefit.amount ?? '',
    annual_leave_days: benefit.annualLeaveDays ?? 0,
    catalog_id: benefit.catalogId ?? '',
    created_at: benefit.createdAt.toISOString(),
    currency: benefit.currency ?? '',
    description: benefit.description ?? '',
    frequency: benefit.frequency ?? '',
    has_monetary_value: benefit.hasMonetaryValue,
    id: benefit.id,
    name: benefit.name ?? '',
    null_fields: nullFields,
    offer_id: benefit.offerId,
    type: benefit.type,
    updated_at: benefit.updatedAt.toISOString()
  } as unknown as OfferBenefitMessage;
}

export function toGrpcOfferDetailMessage(offer: ApplicationOfferRecord): OfferDetailMessage {
  const nullFields = collectNullFields([
    ['seniority_label', offer.seniorityLabel],
    ['department_team', offer.departmentTeam],
    ['reporting_to', offer.reportingTo],
    ['message', offer.message],
    ['bonus_details', offer.bonusDetails],
    ['contract_document_url', offer.contractDocumentUrl],
    ['salary', offer.salary],
    ['salary_period', offer.salaryPeriod],
    ['currency', offer.currency],
    ['employment_type', offer.employmentType],
    ['work_model', offer.workModel],
    ['start_date', offer.startDate],
    ['location', offer.location],
    ['probation_type', offer.probationType],
    ['probation_custom', offer.probationCustom],
    ['expires_at', offer.expiresAt],
    ['sent_at', offer.sentAt],
    ['viewed_at', offer.viewedAt],
    ['responded_at', offer.respondedAt],
    ['deleted_at', offer.deletedAt]
  ]);

  return {
    application_id: offer.applicationId,
    benefits: offer.benefits.map(toGrpcOfferBenefitMessage),
    bonus_details: offer.bonusDetails ?? '',
    candidate_identity_id: offer.candidateIdentityId,
    contract_document_url: offer.contractDocumentUrl ?? '',
    created_at: offer.createdAt.toISOString(),
    created_by_identity_id: offer.createdByIdentityId,
    currency: offer.currency ?? '',
    deleted_at: offer.deletedAt?.toISOString() ?? '',
    department_team: offer.departmentTeam ?? '',
    employer_identity_id: offer.employerIdentityId,
    employment_type: offer.employmentType ?? '',
    expires_at: offer.expiresAt?.toISOString() ?? '',
    id: offer.id,
    job_id: offer.jobId,
    location: offer.location ?? '',
    message: offer.message ?? '',
    null_fields: nullFields,
    probation_custom: offer.probationCustom ?? '',
    probation_type: offer.probationType ?? '',
    reporting_to: offer.reportingTo ?? '',
    responded_at: offer.respondedAt?.toISOString() ?? '',
    salary: offer.salary ?? '',
    salary_period: offer.salaryPeriod ?? '',
    seniority_label: offer.seniorityLabel ?? '',
    sent_at: offer.sentAt?.toISOString() ?? '',
    start_date: offer.startDate ?? '',
    status: offer.status,
    title: offer.title,
    updated_at: offer.updatedAt.toISOString(),
    viewed_at: offer.viewedAt?.toISOString() ?? '',
    work_model: offer.workModel ?? ''
  } as unknown as OfferDetailMessage;
}

export function toGrpcBenefitCatalogMessage(
  catalog: BenefitCatalogRecord
): BenefitCatalogMessage {
  const nullFields: string[] = [];

  if (catalog.description === null) {
    nullFields.push('description');
  }

  return {
    code: catalog.code,
    description: catalog.description ?? '',
    has_monetary_value_default: catalog.hasMonetaryValueDefault,
    id: catalog.id,
    is_selectable: catalog.isSelectable,
    label: catalog.label,
    null_fields: nullFields,
    requires_amount: catalog.requiresAmount,
    requires_annual_leave_days: catalog.requiresAnnualLeaveDays,
    requires_frequency: catalog.requiresFrequency,
    sort_order: catalog.sortOrder
  } as unknown as BenefitCatalogMessage;
}

export function fromGrpcCreateInterviewInput(
  input: CreateInterviewInputMessage
): CreateInterviewInput {
  return {
    callerInfo: optionalProtoString(input.caller_info),
    contactInfo: optionalProtoString(input.contact_info),
    date: optionalProtoString(input.date),
    durationMinutes: optionalProtoNumber(input.duration_minutes),
    fullAddress: optionalProtoString(input.full_address),
    interviewers: (input.interviewers ?? []).map(fromGrpcInterviewerInput),
    locationDetail: optionalProtoString(input.location_detail),
    locationLat: optionalProtoString(input.location_lat),
    locationLng: optionalProtoString(input.location_lng),
    logisticsNote: optionalProtoString(input.logistics_note),
    mapLink: optionalProtoString(input.map_link),
    meetingId: optionalProtoString(input.meeting_id),
    meetingLink: optionalProtoString(input.meeting_link),
    notesToCandidate: optionalProtoString(input.notes_to_candidate),
    officeName: optionalProtoString(input.office_name),
    passcode: optionalProtoString(input.passcode),
    phoneNumber: optionalProtoString(input.phone_number),
    platform: optionalProtoString(input.platform),
    round: input.round,
    startTime: optionalProtoString(input.start_time),
    timezone: optionalProtoString(input.timezone),
    type: input.type
  };
}

export function fromGrpcUpdateInterviewInput(
  input: UpdateInterviewInputMessage
): UpdateInterviewInput {
  const mapped: UpdateInterviewInput = {};

  if (input.type !== undefined) mapped.type = input.type;
  if (input.round !== undefined) mapped.round = input.round;
  if (input.date !== undefined) mapped.date = optionalProtoString(input.date);
  if (input.start_time !== undefined) mapped.startTime = optionalProtoString(input.start_time);
  if (input.duration_minutes !== undefined) {
    mapped.durationMinutes = optionalProtoNumber(input.duration_minutes);
  }
  if (input.timezone !== undefined) mapped.timezone = optionalProtoString(input.timezone);
  if (input.notes_to_candidate !== undefined) {
    mapped.notesToCandidate = optionalProtoString(input.notes_to_candidate);
  }
  if (input.logistics_note !== undefined) {
    mapped.logisticsNote = optionalProtoString(input.logistics_note);
  }
  if (input.interviewers !== undefined) {
    mapped.interviewers = input.interviewers.map(fromGrpcInterviewerInput);
  }
  if (input.platform !== undefined) mapped.platform = optionalProtoString(input.platform);
  if (input.meeting_link !== undefined) mapped.meetingLink = optionalProtoString(input.meeting_link);
  if (input.meeting_id !== undefined) mapped.meetingId = optionalProtoString(input.meeting_id);
  if (input.passcode !== undefined) mapped.passcode = optionalProtoString(input.passcode);
  if (input.office_name !== undefined) mapped.officeName = optionalProtoString(input.office_name);
  if (input.full_address !== undefined) mapped.fullAddress = optionalProtoString(input.full_address);
  if (input.location_detail !== undefined) {
    mapped.locationDetail = optionalProtoString(input.location_detail);
  }
  if (input.location_lat !== undefined) mapped.locationLat = optionalProtoString(input.location_lat);
  if (input.location_lng !== undefined) mapped.locationLng = optionalProtoString(input.location_lng);
  if (input.map_link !== undefined) mapped.mapLink = optionalProtoString(input.map_link);
  if (input.caller_info !== undefined) mapped.callerInfo = optionalProtoString(input.caller_info);
  if (input.contact_info !== undefined) mapped.contactInfo = optionalProtoString(input.contact_info);
  if (input.phone_number !== undefined) mapped.phoneNumber = optionalProtoString(input.phone_number);

  return mapped;
}

function fromGrpcInterviewerInput(input: InterviewerMessage): {
  name: string;
  role?: string | null;
} {
  return {
    name: input.name,
    role: optionalProtoString(input.role)
  };
}

export function fromGrpcOfferBenefitInput(input: OfferBenefitInputMessage): OfferBenefitInput {
  return {
    amount: optionalProtoString(input.amount),
    annualLeaveDays: optionalProtoNumber(input.annual_leave_days),
    catalogId: optionalProtoString(input.catalog_id),
    currency: optionalProtoString(input.currency),
    description: optionalProtoString(input.description),
    frequency: optionalProtoString(input.frequency),
    hasMonetaryValue: input.has_monetary_value,
    name: optionalProtoString(input.name),
    type: input.type
  };
}

export function fromGrpcCreateOfferInput(input: CreateOfferInputMessage): CreateOfferInput {
  return {
    benefits: input.benefits?.map(fromGrpcOfferBenefitInput),
    bonusDetails: optionalProtoString(input.bonus_details),
    contractDocumentUrl: optionalProtoString(input.contract_document_url),
    currency: optionalProtoString(input.currency),
    departmentTeam: optionalProtoString(input.department_team),
    employmentType: optionalProtoString(input.employment_type),
    location: optionalProtoString(input.location),
    message: optionalProtoString(input.message),
    offerExpiresAt: optionalProtoString(input.offer_expires_at),
    probationCustom: optionalProtoString(input.probation_custom),
    probationType: optionalProtoString(input.probation_type),
    reportingTo: optionalProtoString(input.reporting_to),
    salary: optionalProtoString(input.salary),
    salaryPeriod: optionalProtoString(input.salary_period),
    seniorityLabel: optionalProtoString(input.seniority_label),
    startDate: optionalProtoString(input.start_date),
    title: input.title,
    workModel: optionalProtoString(input.work_model)
  };
}

export function fromGrpcUpdateOfferInput(input: UpdateOfferInputMessage): UpdateOfferInput {
  const mapped: UpdateOfferInput = {};

  if (input.title !== undefined) mapped.title = input.title;
  if (input.seniority_label !== undefined) {
    mapped.seniorityLabel = optionalProtoString(input.seniority_label);
  }
  if (input.department_team !== undefined) {
    mapped.departmentTeam = optionalProtoString(input.department_team);
  }
  if (input.reporting_to !== undefined) mapped.reportingTo = optionalProtoString(input.reporting_to);
  if (input.message !== undefined) mapped.message = optionalProtoString(input.message);
  if (input.bonus_details !== undefined) mapped.bonusDetails = optionalProtoString(input.bonus_details);
  if (input.contract_document_url !== undefined) {
    mapped.contractDocumentUrl = optionalProtoString(input.contract_document_url);
  }
  if (input.salary !== undefined) mapped.salary = optionalProtoString(input.salary);
  if (input.salary_period !== undefined) mapped.salaryPeriod = optionalProtoString(input.salary_period);
  if (input.currency !== undefined) mapped.currency = optionalProtoString(input.currency);
  if (input.employment_type !== undefined) {
    mapped.employmentType = optionalProtoString(input.employment_type);
  }
  if (input.work_model !== undefined) mapped.workModel = optionalProtoString(input.work_model);
  if (input.start_date !== undefined) mapped.startDate = optionalProtoString(input.start_date);
  if (input.location !== undefined) mapped.location = optionalProtoString(input.location);
  if (input.offer_expires_at !== undefined) {
    mapped.offerExpiresAt = optionalProtoString(input.offer_expires_at);
  }
  if (input.probation_type !== undefined) {
    mapped.probationType = optionalProtoString(input.probation_type);
  }
  if (input.probation_custom !== undefined) {
    mapped.probationCustom = optionalProtoString(input.probation_custom);
  }
  if (input.benefits !== undefined) {
    mapped.benefits = input.benefits.map(fromGrpcOfferBenefitInput);
  }

  return mapped;
}
