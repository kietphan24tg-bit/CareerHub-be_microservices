import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { InvalidJobStatusTransitionError, Job, JobStatus } from '../../../domain';
import { JobNotFoundError } from '../../errors/job-not-found.error';
import type { JobRecord, JobRepository } from '../../ports';
import type { PublishJobCommand } from './publish-job.command';

export class PublishJobCommandHandler {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(command: PublishJobCommand): Promise<JobRecord> {
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

    const fromStatus = new JobStatus(record.status);
    const job = Job.reconstitute({
      id: new UniqueEntityID(record.id),
      props: { employerIdentityId, status: fromStatus }
    });

    job.publish();

    const updated = await this.jobRepository.saveStatus(
      jobId,
      employerIdentityId,
      fromStatus.value,
      job.status.value
    );

    if (!updated) {
      // Bị chuyển trạng thái đồng thời sau khi đọc → transition không còn hợp lệ.
      throw new InvalidJobStatusTransitionError(fromStatus.value, job.status.value);
    }

    return updated;
  }
}
