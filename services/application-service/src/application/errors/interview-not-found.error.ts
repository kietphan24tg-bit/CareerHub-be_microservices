import { ApplicationError } from '@careerhub/infrastructure';

export class InterviewNotFoundError extends ApplicationError {
  constructor(interviewId?: string) {
    super(interviewId ? `Interview not found: ${interviewId}` : 'Interview not found.', {
      code: 'INTERVIEW_NOT_FOUND'
    });
  }
}
