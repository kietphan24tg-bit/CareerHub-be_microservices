import { ValidationError } from '@careerhub/shared-kernel';
import type { JobRecord, JobRepository } from '../../ports';
import { transitionJobStatus } from '../../utils/transition-job-status';
import type { CloseJobCommand } from './close-job.command';

export class CloseJobCommandHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(command: CloseJobCommand): Promise<JobRecord> {
    if (!command.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!command.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    return transitionJobStatus(
      this.jobRepository,
      command.jobId.trim(),
      command.employerIdentityId.trim(),
      'closed',
      ['published']
    );
  }
}
