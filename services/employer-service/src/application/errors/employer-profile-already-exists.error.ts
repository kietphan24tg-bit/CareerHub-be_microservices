import { ApplicationError } from '@careerhub/infrastructure';

export class EmployerProfileAlreadyExistsError extends ApplicationError {
  constructor(identityId: string) {
    super(`Employer profile already exists for identity: ${identityId}`, {
      code: 'CONFLICT'
    });
  }
}
