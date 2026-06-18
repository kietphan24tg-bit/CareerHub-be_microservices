import type {
  ApplicationHistoryMessage,
  ApplicationMessage,
  ApplicationPageMeta,
  InterviewMessage,
  OfferMessage
} from '@careerhub/contracts';
import type { GatewayJobSummary } from '../../saved-jobs/ports/job-lookup.port';

export type GatewayHttpApplicationWriteResponse = {
  appliedAt: string;
  candidateUserId: string;
  coverLetter: string | null;
  id: string;
  jobId: string;
  resumeId: string | null;
  status: string;
  updatedAt: string;
};

export type GatewayHttpApplicationTimelineItem = {
  actorIdentityId: string | null;
  actorType: string | null;
  applicationId: string;
  createdAt: string;
  eventType: string;
  id: string;
  newStatus: string | null;
  note: string | null;
  oldStatus: string | null;
};

export type GatewayHttpCandidateApplicationListItem = {
  appliedAt: string;
  company: {
    city: string | null;
    companyName: string;
    country: string | null;
    id: string;
    initials: string;
    logoUrl: string | null;
    name: string;
  };
  displayGroup: string;
  id: string;
  interview: {
    date: string | null;
    id: string;
    round: string;
    startTime: string | null;
    status: string;
  } | null;
  job: {
    city: string | null;
    country: string | null;
    currency: string | null;
    employmentLabel: string;
    employmentType: string | null;
    expiresAt: string | null;
    id: string;
    isRemote: boolean;
    locationLine: string;
    salaryMax: string | null;
    salaryMin: string | null;
    salaryTag: string;
    slug: string;
    title: string;
    workStyleTag: string;
  };
  offer: {
    exists: boolean;
    expiresAt: string | null;
    id: string | null;
    needsResponse: boolean;
    respondedAt: string | null;
    sentAt: string | null;
    status: string | null;
  } | null;
  status: string;
  updatedAt: string;
};

export type GatewayHttpCandidateApplicationsList = {
  items: GatewayHttpCandidateApplicationListItem[];
  meta: {
    filter: string;
    page: number;
    pageSize: number;
    sort: string;
    total: number;
  };
  summary: {
    all: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
    reviewed: number;
    withdrawn: number;
  };
};

export type GatewayHttpCandidateApplicationDetail = {
  application: {
    coverLetter: string | null;
  };
  appliedAt: string;
  availableActions: {
    acceptOffer: boolean;
    confirmInterview: boolean;
    declineInterview: boolean;
    declineOffer: boolean;
    requestReschedule: boolean;
    viewInterview: boolean;
    viewOffers: boolean;
    withdrawApplication: boolean;
  };
  company: GatewayHttpCandidateApplicationListItem['company'];
  displayGroup: string;
  id: string;
  interview: {
    date: string | null;
    endTime: string | null;
    exists: boolean;
    id: string | null;
    round: string | null;
    startTime: string | null;
    status: string | null;
    timezone: string | null;
  };
  job: GatewayHttpCandidateApplicationListItem['job'];
  offer: {
    exists: boolean;
    expiresAt: string | null;
    id: string | null;
    needsResponse: boolean;
    respondedAt: string | null;
    sentAt: string | null;
    status: string | null;
  };
  resume: {
    id: string;
    title: string;
  } | null;
  status: string;
  timeline: GatewayHttpApplicationTimelineItem[];
  updatedAt: string;
};

export type GatewayHttpEmployerAtsApplication = {
  applicationId: number;
  candidateId: number;
  candidateName: string | null;
  headline: string | null;
  location: string | null;
  skills: string[];
  stage: string;
  stageContext: {
    label: string;
    type: string;
  } | null;
  updatedAt: string;
  yearsExperience: number | null;
};

export type GatewayHttpEmployerAtsBoard = {
  applications: GatewayHttpEmployerAtsApplication[];
  job: {
    city: string | null;
    country: string | null;
    currency: string | null;
    id: number;
    isRemote: boolean;
    salaryMax: number | null;
    salaryMin: number | null;
    status: string;
    title: string;
  };
};

function nullableString(value: string | undefined, nullFields?: string[], field?: string) {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === '') {
    return null;
  }

  return value;
}

function nullableNumber(value: number | undefined): number | null {
  if (value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}

export function toGatewayHttpApplicationWriteResponse(
  application: ApplicationMessage
): GatewayHttpApplicationWriteResponse {
  const nullFields = application.null_fields ?? [];

  return {
    appliedAt: application.created_at,
    candidateUserId: application.candidate_identity_id,
    coverLetter: nullableString(application.cover_letter, nullFields, 'cover_letter'),
    id: application.id,
    jobId: application.job_id,
    resumeId: nullableString(application.resume_id, nullFields, 'resume_id'),
    status: application.status,
    updatedAt: application.updated_at
  };
}

export function toGatewayHttpApplicationTimelineItem(
  history: ApplicationHistoryMessage
): GatewayHttpApplicationTimelineItem {
  const nullFields = history.null_fields ?? [];

  return {
    actorIdentityId: nullableString(history.actor_identity_id, nullFields, 'actor_identity_id'),
    actorType: nullableString(history.actor_type, nullFields, 'actor_type'),
    applicationId: history.application_id,
    createdAt: history.created_at,
    eventType: history.event_type,
    id: history.id,
    newStatus: nullableString(history.to_status, nullFields, 'to_status'),
    note: nullableString(history.note, nullFields, 'note'),
    oldStatus: nullableString(history.from_status, nullFields, 'from_status')
  };
}

export function toGatewayHttpApplicationPageMeta(meta: ApplicationPageMeta) {
  return {
    page: meta.page,
    pageSize: meta.page_size,
    total: meta.total
  };
}

export function toCandidateApplicationListItem(input: {
  application: ApplicationMessage;
  job: GatewayJobSummary | null;
}): GatewayHttpCandidateApplicationListItem {
  const companyName = input.job?.companyName ?? 'Unknown company';
  const city = input.job?.city ?? null;
  const salaryMin = input.job?.salaryMin;
  const salaryMax = input.job?.salaryMax;
  const currency = input.job?.currency ?? null;

  return {
    appliedAt: input.application.created_at,
    company: {
      city,
      companyName,
      country: input.job?.country ?? null,
      id: input.job?.id ?? input.application.job_id,
      initials: companyInitials(companyName),
      logoUrl: input.job?.companyLogoUrl ?? null,
      name: companyName
    },
    displayGroup: mapDisplayGroup(input.application.status),
    id: input.application.id,
    interview: toCandidateListInterview(input.application.interview, input.application.status),
    job: {
      city,
      country: input.job?.country ?? null,
      currency,
      employmentLabel: formatEmploymentLabel(input.job?.employmentType ?? null),
      employmentType: input.job?.employmentType ?? null,
      expiresAt: input.job?.expiresAt ?? null,
      id: input.application.job_id,
      isRemote: input.job?.isRemote ?? false,
      locationLine: formatLocationLine(companyName, city),
      salaryMax: toNullableNumericString(salaryMax),
      salaryMin: toNullableNumericString(salaryMin),
      salaryTag: formatSalaryTag(salaryMin, salaryMax, currency),
      slug: input.job?.slug ?? input.application.job_id,
      title: input.job?.title ?? 'Unknown job',
      workStyleTag: input.job?.isRemote ? 'Remote' : city ?? 'Onsite'
    },
    offer: toCandidateListOffer(input.application.offer, input.application.status),
    status: input.application.status,
    updatedAt: input.application.updated_at
  };
}

export function toCandidateApplicationDetail(input: {
  application: ApplicationMessage;
  history: ApplicationHistoryMessage[];
  job: GatewayJobSummary | null;
  resume: {
    id: string;
    title: string;
  } | null;
}): GatewayHttpCandidateApplicationDetail {
  const listItem = toCandidateApplicationListItem({
    application: input.application,
    job: input.job
  });
  const interview = toCandidateDetailInterview(input.application.interview);
  const offer = toCandidateDetailOffer(input.application.offer);
  const interviewRespondable = isInterviewRespondable(input.application.interview);
  const offerRespondable = isOfferRespondable(input.application.offer);

  return {
    application: {
      coverLetter: toGatewayHttpApplicationWriteResponse(input.application).coverLetter
    },
    appliedAt: listItem.appliedAt,
    availableActions: {
      acceptOffer: offerRespondable,
      confirmInterview: interviewRespondable,
      declineInterview: interviewRespondable,
      declineOffer: offerRespondable,
      requestReschedule: interviewRespondable,
      viewInterview: interview.exists,
      viewOffers: offer.exists,
      withdrawApplication: isWithdrawableStatus(input.application.status)
    },
    company: listItem.company,
    displayGroup: listItem.displayGroup,
    id: input.application.id,
    interview,
    job: listItem.job,
    offer,
    resume: input.resume,
    status: input.application.status,
    timeline: input.history.map(toGatewayHttpApplicationTimelineItem),
    updatedAt: input.application.updated_at
  };
}

export function toAtsBoardJob(input: {
  city: string | null;
  country: string | null;
  currency: string | null;
  id: string;
  isRemote: boolean;
  salaryMax: number | null;
  salaryMin: number | null;
  status: string;
  title: string;
}): GatewayHttpEmployerAtsBoard['job'] {
  return {
    city: input.city,
    country: input.country,
    currency: input.currency,
    id: toSafeInteger(input.id),
    isRemote: input.isRemote,
    salaryMax: nullableNumber(input.salaryMax ?? undefined),
    salaryMin: nullableNumber(input.salaryMin ?? undefined),
    status: input.status,
    title: input.title
  };
}

export function toAtsStageContext(
  application: ApplicationMessage,
  note?: string | null
) {
  const interview = toInterviewModel(application.interview);
  const offer = toOfferModel(application.offer);

  if (application.status === 'interview' && interview?.date) {
    return {
      label: `Interview: ${formatInterviewLabel(interview.date, interview.startTime)}`,
      type: 'interview'
    };
  }

  if (application.status === 'offer' && offer) {
    return {
      label: offer.sentAt
        ? `Offer: ${formatDateTimeLabel(offer.sentAt)}`
        : `Offer: ${startCase(offer.status)}`,
      type: 'offer'
    };
  }

  if (typeof note === 'string' && note.trim().length > 0) {
    return {
      label: note.trim(),
      type: 'note'
    };
  }

  return {
    label: startCase(mapDisplayGroup(application.status)),
    type: 'stage'
  };
}

export function mapDisplayGroup(status: string) {
  return status === 'shortlisted' ? 'reviewed' : status;
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  return (name.replace(/\s+/g, '').slice(0, 2) || 'CO').toUpperCase();
}

export function formatEmploymentLabel(value: string | null) {
  const labels: Record<string, string> = {
    contract: 'Contract',
    fulltime: 'Full-time',
    intern: 'Intern',
    parttime: 'Part-time'
  };

  return value ? (labels[value] ?? startCase(value)) : 'Not specified';
}

export function formatLocationLine(companyName: string, city: string | null) {
  return city ? `${companyName} Â· ${city}` : companyName;
}

export function formatSalaryTag(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  currency: string | null
) {
  const min = formatMoney(salaryMin, currency);
  const max = formatMoney(salaryMax, currency);

  if (min && max) {
    return `${min} - ${max}`;
  }

  if (min) {
    return min;
  }

  if (max) {
    return max;
  }

  return 'Negotiable';
}

export function buildCandidateApplicationsSummary(totals: {
  all: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  reviewed: number;
  withdrawn: number;
}) {
  return totals;
}

function toInterviewModel(interview?: InterviewMessage | null) {
  if (!interview) {
    return null;
  }

  const nullFields = interview.null_fields ?? [];

  return {
    date: nullableString(interview.date, nullFields, 'date'),
    endTime: nullableString(interview.end_time, nullFields, 'end_time'),
    id: interview.id,
    round: interview.round,
    startTime: nullableString(interview.start_time, nullFields, 'start_time'),
    status: interview.status,
    timezone: nullableString(interview.timezone, nullFields, 'timezone')
  };
}

function toOfferModel(offer?: OfferMessage | null) {
  if (!offer) {
    return null;
  }

  const nullFields = offer.null_fields ?? [];

  return {
    expiresAt: nullableString(offer.expires_at, nullFields, 'expires_at'),
    id: offer.id,
    respondedAt: nullableString(offer.responded_at, nullFields, 'responded_at'),
    sentAt: nullableString(offer.sent_at, nullFields, 'sent_at'),
    status: offer.status,
    viewedAt: nullableString(offer.viewed_at, nullFields, 'viewed_at')
  };
}

function toCandidateListInterview(interview?: InterviewMessage | null, status?: string) {
  const model = toInterviewModel(interview);

  if (!model || status !== 'interview') {
    return null;
  }

  return {
    date: model.date,
    id: model.id,
    round: model.round,
    startTime: model.startTime,
    status: model.status
  };
}

function toCandidateListOffer(offer?: OfferMessage | null, status?: string) {
  const model = toOfferModel(offer);

  if (!model || status !== 'offer') {
    return null;
  }

  return {
    exists: true,
    expiresAt: model.expiresAt,
    id: model.id,
    needsResponse: isOfferRespondable(offer),
    respondedAt: model.respondedAt,
    sentAt: model.sentAt,
    status: model.status
  };
}

function toCandidateDetailInterview(interview?: InterviewMessage | null) {
  const model = toInterviewModel(interview);

  if (!model) {
    return {
      date: null,
      endTime: null,
      exists: false,
      id: null,
      round: null,
      startTime: null,
      status: null,
      timezone: null
    };
  }

  return {
    date: model.date,
    endTime: model.endTime,
    exists: true,
    id: model.id,
    round: model.round,
    startTime: model.startTime,
    status: model.status,
    timezone: model.timezone
  };
}

function toCandidateDetailOffer(offer?: OfferMessage | null) {
  const model = toOfferModel(offer);

  if (!model) {
    return {
      exists: false,
      expiresAt: null,
      id: null,
      needsResponse: false,
      respondedAt: null,
      sentAt: null,
      status: null
    };
  }

  return {
    exists: true,
    expiresAt: model.expiresAt,
    id: model.id,
    needsResponse: isOfferRespondable(offer),
    respondedAt: model.respondedAt,
    sentAt: model.sentAt,
    status: model.status
  };
}

function isInterviewRespondable(interview?: InterviewMessage | null) {
  const model = toInterviewModel(interview);
  return model?.status === 'scheduled' || model?.status === 'rescheduled';
}

function isOfferRespondable(offer?: OfferMessage | null) {
  const model = toOfferModel(offer);

  if (!model) {
    return false;
  }

  if (model.status !== 'sent' && model.status !== 'viewed') {
    return false;
  }

  if (model.respondedAt !== null) {
    return false;
  }

  if (model.expiresAt === null) {
    return false;
  }

  return new Date(model.expiresAt).getTime() > Date.now();
}

function startCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMoney(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const suffix = currency?.trim() ? ` ${currency}` : '';
  return `${value.toLocaleString('en-US')}${suffix}`;
}

function toNullableNumericString(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function toSafeInteger(value: string) {
  const numericValue = Number(value);
  return Number.isSafeInteger(numericValue) ? numericValue : 0;
}

function isWithdrawableStatus(status: string) {
  return status === 'applied' || status === 'reviewed' || status === 'shortlisted';
}

function formatInterviewLabel(date: string, startTime: string | null) {
  const parts = date.split('-');
  const dateLabel =
    parts.length === 3 ? `${parts[2] ?? ''}/${parts[1] ?? ''}` : date;

  return startTime ? `${dateLabel}, ${startTime.slice(0, 5)}` : dateLabel;
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = [
    String(date.getUTCDate()).padStart(2, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0')
  ].join('/');
  const timePart = [
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0')
  ].join(':');

  return `${datePart}, ${timePart}`;
}
