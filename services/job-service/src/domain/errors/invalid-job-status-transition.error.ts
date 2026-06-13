import { DomainError } from '@careerhub/shared-kernel';
import type { JobStatusValue } from '../value-objects';

export class InvalidJobStatusTransitionError extends DomainError {
  constructor(from: JobStatusValue, to: JobStatusValue) {
    super(`Cannot move job from ${from} to ${to}.`, {
      code: 'INVALID_JOB_STATUS_TRANSITION',
      details: {
        from,
        to
      }
    });
  }
}
