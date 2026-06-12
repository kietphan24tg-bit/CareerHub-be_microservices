import { InvalidJobStatusTransitionError } from '../errors/invalid-job-status-transition.error';
import { JobNotFoundError } from '../errors/job-not-found.error';
import type { JobRecord, JobRepository, JobStatus } from '../ports';

export async function transitionJobStatus(
  jobRepository: JobRepository,
  jobId: string,
  employerIdentityId: string,
  nextStatus: JobStatus,
  allowedStatuses: JobStatus[]
): Promise<JobRecord> {
  const updated = await jobRepository.transitionStatus(
    jobId,
    employerIdentityId,
    nextStatus,
    allowedStatuses
  );

  if (updated) {
    return updated;
  }

  const currentJob = await jobRepository.getStatus(jobId, employerIdentityId);

  if (!currentJob) {
    throw new JobNotFoundError(jobId);
  }

  throw new InvalidJobStatusTransitionError(currentJob.status, nextStatus);
}
