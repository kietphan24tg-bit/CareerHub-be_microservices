import { ValidationError } from '@careerhub/shared-kernel';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import type { JobRecord, JobRepository } from '../../ports';
import type { GetJobForApplicationQuery } from './get-job-for-application.query';

export class GetJobForApplicationQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: GetJobForApplicationQuery): Promise<JobRecord> {
    if (!query.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    const job = await this.jobRepository.findById(query.jobId.trim());

    if (!job) {
      throw new JobNotFoundError(query.jobId);
    }

    return job;
  }
}
