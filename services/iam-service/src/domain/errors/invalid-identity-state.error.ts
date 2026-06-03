import { DomainError } from '@careerhub/shared-kernel';

export class InvalidIdentityStateError extends DomainError {
  constructor(message: string) {
    super(message, {
      code: 'INVALID_IDENTITY_STATE'
    });
  }
}
