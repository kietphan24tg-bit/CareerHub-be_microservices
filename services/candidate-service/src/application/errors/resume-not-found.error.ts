import { ApplicationError } from '@careerhub/infrastructure';

export class ResumeNotFoundError extends ApplicationError {
  constructor(resumeId: string) {
    super(`Resume not found: ${resumeId}`, {
      code: 'NOT_FOUND'
    });
  }
}
