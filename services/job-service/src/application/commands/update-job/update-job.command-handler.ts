import { ValidationError } from '@careerhub/shared-kernel';
import {
  createIntegrationEvent,
  JOB_UPDATED_EVENT_NAME
} from '@careerhub/contracts';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import { persistJobOutbox } from '../../outbox/job-outbox-event.mapper';
import type { IdGenerator, JobRecord, JobRepository, OutboxRepository } from '../../ports';
import { writeJobWithUniqueSlug } from '../../utils/job-slug';
import type { UpdateJobCommand } from './update-job.command';

export class UpdateJobCommandHandler {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: UpdateJobCommand): Promise<JobRecord> {
    if (!command.employerIdentityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (!command.jobId.trim()) {
      throw new ValidationError('Job id is required');
    }

    const existingJob = await this.jobRepository.findByIdAndEmployer(
      command.jobId.trim(),
      command.employerIdentityId.trim()
    );

    if (!existingJob) {
      throw new JobNotFoundError(command.jobId);
    }

    const patch = {
      ...(command.title !== undefined ? { title: command.title.trim() } : {}),
      ...(command.description !== undefined
        ? { description: command.description?.trim() || null }
        : {}),
      ...(command.responsibilities !== undefined
        ? { responsibilities: command.responsibilities }
        : {}),
      ...(command.requirements !== undefined
        ? { requirements: command.requirements }
        : {}),
      ...(command.benefits !== undefined ? { benefits: command.benefits } : {}),
      ...(command.employmentType !== undefined
        ? { employmentType: command.employmentType }
        : {}),
      ...(command.experienceLevel !== undefined
        ? { experienceLevel: command.experienceLevel }
        : {}),
      ...(command.level !== undefined ? { level: command.level } : {}),
      ...(command.category !== undefined
        ? { category: command.category?.trim() || null }
        : {}),
      ...(command.city !== undefined
        ? { city: command.city?.trim() || null }
        : {}),
      ...(command.country !== undefined
        ? { country: command.country?.trim() || null }
        : {}),
      ...(command.isRemote !== undefined ? { isRemote: command.isRemote } : {}),
      ...(command.salaryMin !== undefined ? { salaryMin: command.salaryMin } : {}),
      ...(command.salaryMax !== undefined ? { salaryMax: command.salaryMax } : {}),
      ...(command.saturdayPolicy !== undefined
        ? { saturdayPolicy: command.saturdayPolicy }
        : {}),
      ...(command.currency !== undefined
        ? { currency: command.currency?.trim() || null }
        : {}),
      ...(command.expiresAt !== undefined
        ? {
            expiresAt: command.expiresAt ? new Date(command.expiresAt) : null
          }
        : {})
    };

    const shouldRefreshSlug =
      command.title !== undefined && command.title.trim() !== existingJob.title;

    let updated: JobRecord;

    if (!shouldRefreshSlug) {
      const result = await this.jobRepository.update(
        existingJob.id,
        command.employerIdentityId.trim(),
        patch
      );

      if (!result) {
        throw new JobNotFoundError(command.jobId);
      }

      updated = result;
    } else {
      updated = await writeJobWithUniqueSlug(
        this.jobRepository,
        command.title as string,
        existingJob.id,
        async (slug) => {
          const result = await this.jobRepository.update(
            existingJob.id,
            command.employerIdentityId.trim(),
            { ...patch, slug }
          );

          if (!result) {
            throw new JobNotFoundError(command.jobId);
          }

          return result;
        }
      );
    }

    await persistJobOutbox(
      this.outboxRepository,
      createIntegrationEvent(JOB_UPDATED_EVENT_NAME, {
        employerIdentityId: command.employerIdentityId.trim(),
        jobId: updated.id,
        slug: updated.slug
      }),
      { createOutboxId: () => this.idGenerator.generate() }
    );

    return updated;
  }
}
