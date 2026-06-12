import type { JobRecord, JobRepository } from '../../ports';
import type { ListJobsByIdsQuery } from './list-jobs-by-ids.query';

export class ListJobsByIdsQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: ListJobsByIdsQuery): Promise<JobRecord[]> {
    const jobIds = [...new Set(query.jobIds.map((jobId) => jobId.trim()).filter(Boolean))];

    if (jobIds.length === 0) {
      return [];
    }

    return this.jobRepository.findByIds(jobIds);
  }
}
