import { ApplicationError } from '@careerhub/infrastructure';
import type { ApplicationStatus } from '../ports';

export class InvalidApplicationStatusTransitionError extends ApplicationError {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Cannot move application from ${from} to ${to}.`, {
      code: 'INVALID_APPLICATION_STATUS_TRANSITION',
      details: {
        from,
        to
      }
    });
  }
}
