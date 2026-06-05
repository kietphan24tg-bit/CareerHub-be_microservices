import { ApplicationError } from '@careerhub/nest-common';

export class IdentityNotFoundError extends ApplicationError {
  constructor(identityId: string) {
    super(`Identity not found: ${identityId}`, {
      code: 'NOT_FOUND'
    });
  }
}
