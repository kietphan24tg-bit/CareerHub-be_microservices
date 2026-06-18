import { ValidationError } from '@careerhub/shared-kernel';
import type { ApplicationInterviewRecord } from '../ports/recruitment-repository.port';

export const INTERVIEW_TYPE_VALUES = ['online', 'onsite', 'phone'] as const;
export type InterviewType = (typeof INTERVIEW_TYPE_VALUES)[number];

const SLOT_FIELDS = new Set([
  'date',
  'startTime',
  'durationMinutes',
  'timezone',
  'platform',
  'meetingLink',
  'meetingId',
  'passcode',
  'officeName',
  'fullAddress',
  'locationDetail',
  'locationLat',
  'locationLng',
  'mapLink',
  'callerInfo',
  'contactInfo',
  'phoneNumber',
  'type'
]);

export type InterviewScheduleInput = {
  date?: string | null;
  durationMinutes?: number | null;
  startTime?: string | null;
};

export type NormalizedInterviewSchedule = {
  date: string | null;
  durationMinutes: number | null;
  endTime: string | null;
  startTime: string | null;
};

export type InterviewScheduleUpdateInput = InterviewScheduleInput & {
  callerInfo?: string | null;
  contactInfo?: string | null;
  fullAddress?: string | null;
  locationDetail?: string | null;
  locationLat?: string | number | null;
  locationLng?: string | number | null;
  mapLink?: string | null;
  meetingId?: string | null;
  meetingLink?: string | null;
  officeName?: string | null;
  passcode?: string | null;
  phoneNumber?: string | null;
  platform?: string | null;
  timezone?: string | null;
  type?: string | null;
};

export function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeRequiredString(value: string, message: string): string {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

export function normalizeInterviewType(value: string): InterviewType {
  if (!INTERVIEW_TYPE_VALUES.includes(value as InterviewType)) {
    throw new ValidationError('Interview type is invalid.');
  }

  return value as InterviewType;
}

export function normalizeInterviewers(
  value?: Array<{ name: string; role?: string | null }> | null
): Array<{ name: string; role: string | null }> {
  if (!value || value.length === 0) {
    return [];
  }

  return value.map((interviewer) => ({
    name: interviewer.name.trim(),
    role: normalizeNullableString(interviewer.role)
  }));
}

export function readInterviewers(value: unknown): Array<{ name: string; role: string | null }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      role: typeof item.role === 'string' ? item.role : null
    }))
    .filter((item) => item.name.length > 0);
}

export function toDateOnly(value: string): string {
  const normalized = value.trim();
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ValidationError('Date is invalid.');
  }

  return normalized;
}

export function toTimeOnly(value: string): string {
  const normalized = value.trim();
  const parsed = new Date(`1970-01-01T${normalized}Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Time is invalid.');
  }

  return parsed.toISOString().slice(11, 19);
}

export function addMinutesToTime(startTime: string, minutes: number): string {
  const parsed = new Date(`1970-01-01T${startTime}Z`);
  return new Date(parsed.getTime() + minutes * 60_000).toISOString().slice(11, 19);
}

export function normalizeInterviewSchedule(
  input: InterviewScheduleInput,
  existing?: Pick<
    ApplicationInterviewRecord,
    'date' | 'durationMinutes' | 'endTime' | 'startTime'
  >
): NormalizedInterviewSchedule {
  const date =
    input.date === undefined ? (existing?.date ?? null) : input.date ? toDateOnly(input.date) : null;
  const startTime =
    input.startTime === undefined
      ? (existing?.startTime ?? null)
      : input.startTime
        ? toTimeOnly(input.startTime)
        : null;
  const durationMinutes =
    input.durationMinutes === undefined
      ? (existing?.durationMinutes ?? null)
      : input.durationMinutes;

  if ((date && !startTime) || (!date && startTime)) {
    throw new ValidationError('Interview date and start time must be provided together.');
  }

  const endTime =
    startTime && durationMinutes ? addMinutesToTime(startTime, durationMinutes) : (existing?.endTime ?? null);

  return {
    date,
    durationMinutes,
    endTime,
    startTime
  };
}

export function hasInterviewSlotChange(
  interview: ApplicationInterviewRecord,
  input: InterviewScheduleUpdateInput,
  updatedSchedule: NormalizedInterviewSchedule
): boolean {
  for (const key of Object.keys(input)) {
    if (!SLOT_FIELDS.has(key)) {
      continue;
    }

    switch (key) {
      case 'date':
        if (interview.date !== updatedSchedule.date) {
          return true;
        }
        break;
      case 'startTime':
        if (interview.startTime !== updatedSchedule.startTime) {
          return true;
        }
        break;
      case 'durationMinutes':
        if (interview.durationMinutes !== updatedSchedule.durationMinutes) {
          return true;
        }
        break;
      case 'timezone':
        if (normalizeNullableString(input.timezone) !== interview.timezone) {
          return true;
        }
        break;
      case 'type':
        if (input.type && normalizeInterviewType(input.type) !== interview.type) {
          return true;
        }
        break;
      case 'locationLat':
        if (normalizeNullableString(String(input.locationLat ?? '')) !== interview.locationLat) {
          return true;
        }
        break;
      case 'locationLng':
        if (normalizeNullableString(String(input.locationLng ?? '')) !== interview.locationLng) {
          return true;
        }
        break;
      default: {
        const currentValue = getInterviewSlotStringValue(interview, key);
        const nextValue = getInterviewUpdateStringValue(input, key);
        if (currentValue !== nextValue) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}

function getInterviewSlotStringValue(
  interview: ApplicationInterviewRecord,
  key: string
): string | null {
  const mapping: Record<string, string | null> = {
    callerInfo: interview.callerInfo,
    contactInfo: interview.contactInfo,
    fullAddress: interview.fullAddress,
    locationDetail: interview.locationDetail,
    mapLink: interview.mapLink,
    meetingId: interview.meetingId,
    meetingLink: interview.meetingLink,
    officeName: interview.officeName,
    passcode: interview.passcode,
    phoneNumber: interview.phoneNumber,
    platform: interview.platform
  };

  return mapping[key] ?? null;
}

function getInterviewUpdateStringValue(
  input: InterviewScheduleUpdateInput,
  key: string
): string | null {
  const mapping: Record<string, string | null | undefined> = {
    callerInfo: input.callerInfo,
    contactInfo: input.contactInfo,
    fullAddress: input.fullAddress,
    locationDetail: input.locationDetail,
    mapLink: input.mapLink,
    meetingId: input.meetingId,
    meetingLink: input.meetingLink,
    officeName: input.officeName,
    passcode: input.passcode,
    phoneNumber: input.phoneNumber,
    platform: input.platform
  };

  return normalizeNullableString(mapping[key]);
}

export function pickNullableString(
  next: string | null | undefined,
  current: string | null
): string | null {
  if (next === undefined) {
    return current;
  }

  return normalizeNullableString(next);
}

export function normalizeDecimal(value: string | number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value);
}
