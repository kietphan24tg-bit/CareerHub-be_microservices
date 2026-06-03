import { DomainError } from '@careerhub/shared-kernel';

export class InvalidRoleError extends DomainError {
  constructor(role: string) {
    super(`Role "${role}" is not supported`, {
      code: 'INVALID_ROLE'
    });
  }
}
