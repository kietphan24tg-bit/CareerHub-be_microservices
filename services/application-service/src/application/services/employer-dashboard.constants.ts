export const DASHBOARD_PIPELINE_LIMIT = 8;
export const DASHBOARD_ACTIVITY_LIMIT = 8;
export const DASHBOARD_TODAY_INTERVIEW_LIMIT = 8;

export const DASHBOARD_ACTIVE_INTERVIEW_STATUSES = [
  'scheduled',
  'confirmed',
  'rescheduled'
] as const;

export const DASHBOARD_OPEN_OFFER_STATUSES = ['sent', 'viewed'] as const;

export const RECRUITER_NOTE_BODY_MAX_LENGTH = 1000;
