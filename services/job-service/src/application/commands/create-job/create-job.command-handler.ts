import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { Job } from '../../../domain';
import type { IdGenerator, JobRecord, JobRepository } from '../../ports';
import { writeJobWithUniqueSlug } from '../../utils/job-slug';
import type { CreateJobCommand } from './create-job.command';

export class CreateJobCommandHandler {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: CreateJobCommand): Promise<JobRecord> {
    if (!command.companyId.trim()) {
      throw new ValidationError('Company id is required');
    }

    if (!command.companyName.trim()) {
      throw new ValidationError('Company name is required');
    }

    if (!command.title.trim()) {
      throw new ValidationError('Job title is required');
    }

    // employerIdentityId validation is enforced inside Job.create()
    const job = Job.create({
      id: new UniqueEntityID(this.idGenerator.generate()),
      employerIdentityId: command.employerIdentityId
    });

    return writeJobWithUniqueSlug(
      this.jobRepository,
      command.title.trim(),
      undefined,
      async (slug) =>
        this.jobRepository.create({
          benefits: command.benefits ?? [],
          category: command.category?.trim() || null,
          city: command.city?.trim() || null,
          companyId: command.companyId.trim(),
          companyIndustry: command.companyIndustry?.trim() || null,
          companyLogoUrl: command.companyLogoUrl?.trim() || null,
          companyName: command.companyName.trim(),
          companyWebsite: command.companyWebsite?.trim() || null,
          country: command.country?.trim() || null,
          currency: command.currency?.trim() || null,
          description: command.description?.trim() || null,
          employerIdentityId: job.employerIdentityId,
          employmentType: command.employmentType ?? null,
          expiresAt: command.expiresAt ? new Date(command.expiresAt) : null,
          id: job.id.toString(),
          isRemote: command.isRemote ?? false,
          level: command.level ?? null,
          requirements: command.requirements ?? [],
          responsibilities: command.responsibilities ?? [],
          salaryMax: command.salaryMax ?? null,
          salaryMin: command.salaryMin ?? null,
          slug,
          title: command.title.trim()
        })
    );
  }
}
