import { ValidationError } from '@careerhub/shared-kernel';
import {
  createIntegrationEvent,
  JOB_DELETED_EVENT_NAME
} from '@careerhub/contracts';
import { JobDeleteNotAllowedError } from '../../errors/job-delete-not-allowed.error';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import { persistJobOutbox } from '../../outbox/job-outbox-event.mapper';
import type { IdGenerator, JobRepository, OutboxRepository } from '../../ports';
import type { DeleteJobCommand } from './delete-job.command';

export class DeleteJobCommandHandler {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: DeleteJobCommand): Promise<void> {
    const employerIdentityId = command.employerIdentityId.trim();
    const jobId = command.jobId.trim();

    if (!employerIdentityId) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!jobId) {
      throw new ValidationError('Job id is required');
    }

    const record = await this.jobRepository.findByIdAndEmployer(
      jobId,
      employerIdentityId
    );

    if (!record) {
      throw new JobNotFoundError(jobId);
    }

    if (record.status !== 'draft') {
      throw new JobDeleteNotAllowedError(record.status);
    }

    const deleted = await this.jobRepository.deleteByIdAndEmployer(
      jobId,
      employerIdentityId
    );

    if (!deleted) {
      throw new JobNotFoundError(jobId);
    }

    await persistJobOutbox(
      this.outboxRepository,
      createIntegrationEvent(JOB_DELETED_EVENT_NAME, {
        employerIdentityId,
        jobId,
        slug: record.slug
      }),
      { createOutboxId: () => this.idGenerator.generate() }
    );
  }
}
