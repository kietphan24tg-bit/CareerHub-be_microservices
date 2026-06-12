import { ValidationError } from '@careerhub/shared-kernel';
import type { JobRepository } from '../../ports';
import type { JobExistsQuery } from './job-exists.query';

export class JobExistsQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: JobExistsQuery): Promise<boolean> {
    if (!query.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    return this.jobRepository.existsById(query.jobId.trim());
  }
}
