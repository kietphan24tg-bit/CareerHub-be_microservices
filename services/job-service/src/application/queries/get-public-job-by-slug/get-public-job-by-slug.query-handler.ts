import { ValidationError } from '@careerhub/shared-kernel';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import type { JobRecord, JobRepository } from '../../ports';
import type { GetPublicJobBySlugQuery } from './get-public-job-by-slug.query';

export class GetPublicJobBySlugQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: GetPublicJobBySlugQuery): Promise<JobRecord> {
    if (!query.slug.trim()) {
      throw new ValidationError('Job slug is required');
    }

    const job = await this.jobRepository.findPublicBySlug(query.slug.trim());

    if (!job) {
      throw new JobNotFoundError();
    }

    return job;
  }
}
