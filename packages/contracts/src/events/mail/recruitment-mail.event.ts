import type { IntegrationEvent } from '../integration-event';

export const MAIL_INTERVIEW_CREATED_EVENT_NAME = 'mail.interview-created.v1';
export const MAIL_INTERVIEW_UPDATED_EVENT_NAME = 'mail.interview-updated.v1';
export const MAIL_INTERVIEW_CANCELLED_EVENT_NAME = 'mail.interview-cancelled.v1';
export const MAIL_OFFER_SENT_EVENT_NAME = 'mail.offer-sent.v1';

export const RECRUITMENT_MAIL_EVENT_NAMES = [
  MAIL_INTERVIEW_CREATED_EVENT_NAME,
  MAIL_INTERVIEW_UPDATED_EVENT_NAME,
  MAIL_INTERVIEW_CANCELLED_EVENT_NAME,
  MAIL_OFFER_SENT_EVENT_NAME
] as const;

export type RecruitmentMailEventName = (typeof RECRUITMENT_MAIL_EVENT_NAMES)[number];

export type RecruitmentMailOfferBenefitPayload = {
  amount: string | null;
  annualLeaveDays: number | null;
  currency: string | null;
  description: string | null;
  frequency: string | null;
  hasMonetaryValue: boolean;
  name: string | null;
  type: string;
};

export type RecruitmentMailInterviewPayload = {
  appUrl: string;
  companyName: string;
  date: string | null;
  endTime: string | null;
  interviewId: string;
  jobTitle: string;
  meetingLink: string | null;
  platform: string | null;
  preview: string;
  recipientIdentityId: string;
  sourceEventId: string;
  startTime: string | null;
  subject: string;
  timezone: string | null;
  type: string;
};

export type RecruitmentMailOfferPayload = {
  appUrl: string;
  benefits: RecruitmentMailOfferBenefitPayload[];
  bonusDetails: string | null;
  companyName: string;
  contractDocumentUrl: string | null;
  currency: string | null;
  departmentTeam: string | null;
  employmentType: string | null;
  expiresAt: string | null;
  location: string | null;
  message: string | null;
  offerId: string;
  preview: string;
  probationCustom: string | null;
  probationType: string | null;
  recipientIdentityId: string;
  reportingTo: string | null;
  salary: string | null;
  salaryPeriod: string | null;
  seniorityLabel: string | null;
  sourceEventId: string;
  startDate: string | null;
  subject: string;
  title: string;
  workModel: string | null;
};

export type RecruitmentMailInterviewIntegrationEvent =
  IntegrationEvent<RecruitmentMailInterviewPayload> & {
    name:
      | typeof MAIL_INTERVIEW_CREATED_EVENT_NAME
      | typeof MAIL_INTERVIEW_UPDATED_EVENT_NAME
      | typeof MAIL_INTERVIEW_CANCELLED_EVENT_NAME;
  };

export type RecruitmentMailOfferIntegrationEvent =
  IntegrationEvent<RecruitmentMailOfferPayload> & {
    name: typeof MAIL_OFFER_SENT_EVENT_NAME;
  };

export type RecruitmentMailIntegrationEvent =
  | RecruitmentMailInterviewIntegrationEvent
  | RecruitmentMailOfferIntegrationEvent;

const RECRUITMENT_MAIL_EVENT_NAME_SET = new Set<string>(RECRUITMENT_MAIL_EVENT_NAMES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOfferBenefitPayload(value: unknown): value is RecruitmentMailOfferBenefitPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNullableString(value.amount) &&
    (value.annualLeaveDays === null || typeof value.annualLeaveDays === 'number') &&
    isNullableString(value.currency) &&
    isNullableString(value.description) &&
    isNullableString(value.frequency) &&
    typeof value.hasMonetaryValue === 'boolean' &&
    isNullableString(value.name) &&
    typeof value.type === 'string'
  );
}

function isInterviewMailPayload(value: unknown): value is RecruitmentMailInterviewPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.appUrl === 'string' &&
    typeof value.companyName === 'string' &&
    isNullableString(value.date) &&
    isNullableString(value.endTime) &&
    typeof value.interviewId === 'string' &&
    typeof value.jobTitle === 'string' &&
    isNullableString(value.meetingLink) &&
    isNullableString(value.platform) &&
    typeof value.preview === 'string' &&
    typeof value.recipientIdentityId === 'string' &&
    typeof value.sourceEventId === 'string' &&
    isNullableString(value.startTime) &&
    typeof value.subject === 'string' &&
    isNullableString(value.timezone) &&
    typeof value.type === 'string'
  );
}

function isOfferMailPayload(value: unknown): value is RecruitmentMailOfferPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.appUrl === 'string' &&
    Array.isArray(value.benefits) &&
    value.benefits.every((benefit) => isOfferBenefitPayload(benefit)) &&
    isNullableString(value.bonusDetails) &&
    typeof value.companyName === 'string' &&
    isNullableString(value.contractDocumentUrl) &&
    isNullableString(value.currency) &&
    isNullableString(value.departmentTeam) &&
    isNullableString(value.employmentType) &&
    isNullableString(value.expiresAt) &&
    isNullableString(value.location) &&
    isNullableString(value.message) &&
    typeof value.offerId === 'string' &&
    typeof value.preview === 'string' &&
    isNullableString(value.probationCustom) &&
    isNullableString(value.probationType) &&
    typeof value.recipientIdentityId === 'string' &&
    isNullableString(value.reportingTo) &&
    isNullableString(value.salary) &&
    isNullableString(value.salaryPeriod) &&
    isNullableString(value.seniorityLabel) &&
    typeof value.sourceEventId === 'string' &&
    isNullableString(value.startDate) &&
    typeof value.subject === 'string' &&
    typeof value.title === 'string' &&
    isNullableString(value.workModel)
  );
}

export function isRecruitmentMailInterviewEvent(
  value: unknown
): value is RecruitmentMailInterviewIntegrationEvent {
  if (!isRecord(value)) {
    return false;
  }

  const eventName = value.name;
  if (
    eventName !== MAIL_INTERVIEW_CREATED_EVENT_NAME &&
    eventName !== MAIL_INTERVIEW_UPDATED_EVENT_NAME &&
    eventName !== MAIL_INTERVIEW_CANCELLED_EVENT_NAME
  ) {
    return false;
  }

  return isInterviewMailPayload(value.payload);
}

export function isRecruitmentMailOfferEvent(
  value: unknown
): value is RecruitmentMailOfferIntegrationEvent {
  if (!isRecord(value)) {
    return false;
  }

  return value.name === MAIL_OFFER_SENT_EVENT_NAME && isOfferMailPayload(value.payload);
}

export function isRecruitmentMailEvent(value: unknown): value is RecruitmentMailIntegrationEvent {
  return isRecruitmentMailInterviewEvent(value) || isRecruitmentMailOfferEvent(value);
}

export function isKnownRecruitmentMailEventName(
  eventName: string
): eventName is RecruitmentMailEventName {
  return RECRUITMENT_MAIL_EVENT_NAME_SET.has(eventName);
}
