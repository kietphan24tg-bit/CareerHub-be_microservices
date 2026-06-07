import { ApplicationError } from '@careerhub/infrastructure';

export class EmployerProfileNotFoundError extends ApplicationError {
  constructor(identityId: string) {
    super(`Employer profile not found for identity: ${identityId}`, {
      code: 'NOT_FOUND'
    });
  }
}
