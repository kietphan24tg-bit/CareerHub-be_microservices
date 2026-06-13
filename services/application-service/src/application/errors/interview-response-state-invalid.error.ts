import { ApplicationError } from '@careerhub/infrastructure';

export class InterviewResponseStateInvalidError extends ApplicationError {
  constructor() {
    super('This interview is no longer awaiting a candidate response.', {
      code: 'INTERVIEW_RESPONSE_STATE_INVALID'
    });
  }
}
