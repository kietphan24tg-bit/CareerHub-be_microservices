import type { ApplicationRepository } from '../../ports';
import type { GetApplicationCountsByJobIdsQuery } from './get-application-counts-by-job-ids.query';

export type GetApplicationCountsByJobIdsResult = Array<{
  count: number;
  jobId: string;
}>;

export class GetApplicationCountsByJobIdsQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(
    query: GetApplicationCountsByJobIdsQuery
  ): Promise<GetApplicationCountsByJobIdsResult> {
    const uniqueJobIds = Array.from(
      new Set(
        (query.jobIds ?? [])
          .map((jobId) => jobId.trim())
          .filter((jobId) => jobId.length > 0)
      )
    );

    if (uniqueJobIds.length === 0) {
      return [];
    }

    const counts = await this.applicationRepository.listCountsByJobIds(uniqueJobIds);
    const countsByJobId = new Map(counts.map((item) => [item.jobId, item.count]));

    return uniqueJobIds.map((jobId) => ({
      count: countsByJobId.get(jobId) ?? 0,
      jobId
    }));
  }
}
