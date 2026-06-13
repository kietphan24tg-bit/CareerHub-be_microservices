import { ApplicationError } from '@careerhub/infrastructure';

export class ForbiddenApplicationAccessError extends ApplicationError {
  constructor(applicationId: string) {
    super(`Access to application ${applicationId} is forbidden.`, {
      code: 'FORBIDDEN_APPLICATION_ACCESS'
    });
  }
}
