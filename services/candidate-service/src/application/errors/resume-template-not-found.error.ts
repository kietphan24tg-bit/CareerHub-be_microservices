import { ApplicationError } from '@careerhub/infrastructure';

export class ResumeTemplateNotFoundError extends ApplicationError {
  constructor(templateId: string) {
    super(`Resume template not found: ${templateId}`, {
      code: 'NOT_FOUND'
    });
  }
}
