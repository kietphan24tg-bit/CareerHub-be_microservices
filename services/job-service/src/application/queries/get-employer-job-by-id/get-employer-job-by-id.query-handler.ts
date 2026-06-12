import { ValidationError } from '@careerhub/shared-kernel';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import type { JobRecord, JobRepository } from '../../ports';
import type { GetEmployerJobByIdQuery } from './get-employer-job-by-id.query';

export class GetEmployerJobByIdQueryHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: GetEmployerJobByIdQuery): Promise<JobRecord> {
    if (!query.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!query.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    const job = await this.jobRepository.findByIdAndEmployer(
      query.jobId.trim(),
      query.employerIdentityId.trim()
    );

    if (!job) {
      throw new JobNotFoundError(query.jobId);
    }

    return job;
  }
}
