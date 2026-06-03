import { DomainError } from '@careerhub/shared-kernel';

export class IdentityDisabledError extends DomainError {
  constructor() {
    super('Identity is disabled', {
      code: 'IDENTITY_DISABLED'
    });
  }
}
