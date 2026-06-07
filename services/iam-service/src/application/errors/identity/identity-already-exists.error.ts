import { ApplicationError } from '@careerhub/infrastructure';

export class IdentityAlreadyExistsError extends ApplicationError {
  constructor(email: string) {
    super(`Identity already exists for email: ${email}`, {
      code: 'CONFLICT'
    });
  }
}
