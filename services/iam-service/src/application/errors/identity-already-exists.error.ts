import { ApplicationError } from '@careerhub/nest-common';

export class IdentityAlreadyExistsError extends ApplicationError {
  constructor(email: string) {
    super(`Identity already exists for email: ${email}`, {
      code: 'CONFLICT'
    });
  }
}
