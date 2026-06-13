import { ApplicationError } from '@careerhub/infrastructure';

export class InterviewStateInvalidError extends ApplicationError {
  constructor() {
    super('This interview can no longer be changed by the employer.', {
      code: 'INTERVIEW_STATE_INVALID'
    });
  }
}
