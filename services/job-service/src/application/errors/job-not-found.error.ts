import { ApplicationError } from '@careerhub/infrastructure';

export class JobNotFoundError extends ApplicationError {
  constructor(jobId?: string) {
    super(jobId ? `Job not found: ${jobId}` : 'Job not found.', {
      code: 'JOB_NOT_FOUND'
    });
  }
}
