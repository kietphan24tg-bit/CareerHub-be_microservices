import { ApplicationError } from '@careerhub/infrastructure';
import type { JobStatus } from '../ports';

export class InvalidJobStatusTransitionError extends ApplicationError {
  constructor(from: JobStatus, to: JobStatus) {
    super(`Cannot move job from ${from} to ${to}.`, {
      code: 'INVALID_JOB_STATUS_TRANSITION',
      details: {
        from,
        to
      }
    });
  }
}
