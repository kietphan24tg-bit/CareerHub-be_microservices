import type { GatewayJobSummary, JobLookupPort } from '../ports/job-lookup.port';

export class NoOpJobLookupAdapter implements JobLookupPort {
  async findByIds(jobIds: string[]): Promise<Map<string, GatewayJobSummary | null>> {
    return new Map(jobIds.map((jobId) => [jobId, null]));
  }
}