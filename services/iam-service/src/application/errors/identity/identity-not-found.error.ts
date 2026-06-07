import { ApplicationError } from '@careerhub/infrastructure';

export class IdentityNotFoundError extends ApplicationError {
  constructor(identityId: string) {
    super(`Identity not found: ${identityId}`, {
      code: 'NOT_FOUND'
    });
  }
}
