import { ApplicationError } from '@careerhub/infrastructure';

export class InterviewApplicationStateInvalidError extends ApplicationError {
  constructor() {
    super('This application can no longer be scheduled for interview.', {
      code: 'INTERVIEW_APPLICATION_STATE_INVALID'
    });
  }
}
