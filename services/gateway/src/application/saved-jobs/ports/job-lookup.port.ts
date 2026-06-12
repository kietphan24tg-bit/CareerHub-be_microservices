export type GatewayJobSummary = {
  city: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  country: string | null;
  currency: string | null;
  employmentType: string | null;
  expiresAt: string | null;
  id: string;
  isRemote: boolean;
  level: string | null;
  salaryMax: number | null;
  salaryMin: number | null;
  slug: string;
  status: string;
  title: string;
};

export interface JobLookupPort {
  findByIds(jobIds: string[]): Promise<Map<string, GatewayJobSummary | null>>;
}

export const JOB_LOOKUP_PORT = Symbol('JOB_LOOKUP_PORT');