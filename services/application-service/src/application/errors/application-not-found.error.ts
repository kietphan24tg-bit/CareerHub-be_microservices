import { ApplicationError } from '@careerhub/infrastructure';

export class ApplicationNotFoundError extends ApplicationError {
  constructor(applicationId?: string) {
    super(
      applicationId
        ? `Application not found: ${applicationId}`
        : 'Application not found.',
      {
        code: 'APPLICATION_NOT_FOUND'
      }
    );
  }
}
