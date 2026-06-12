export type GatewayJobSummary = {
  id: string;
  title: string;
};

export interface JobLookupPort {
  findByIds(jobIds: string[]): Promise<Map<string, GatewayJobSummary | null>>;
}

export const JOB_LOOKUP_PORT = Symbol('JOB_LOOKUP_PORT');