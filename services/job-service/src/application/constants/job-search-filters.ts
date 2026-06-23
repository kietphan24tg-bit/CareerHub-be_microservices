export const SATURDAY_POLICIES = [
  'unspecified',
  'works_saturday',
  'off_saturday'
] as const;

export const EXPERIENCE_LEVELS = [
  'unspecified',
  'none',
  'under_1',
  'y1',
  'y2',
  'y3',
  'y4',
  'y5',
  'over_5'
] as const;

export type SaturdayPolicy = (typeof SATURDAY_POLICIES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export function isSaturdayPolicy(value: string | undefined): value is SaturdayPolicy {
  return value !== undefined && SATURDAY_POLICIES.includes(value as SaturdayPolicy);
}

export function isExperienceLevel(value: string | undefined): value is ExperienceLevel {
  return value !== undefined && EXPERIENCE_LEVELS.includes(value as ExperienceLevel);
}
