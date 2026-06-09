import { ValidationError } from '@careerhub/shared-kernel';

export class InvalidPasswordResetTokenError extends ValidationError {
  constructor() {
    super('Password reset token is invalid or expired');
  }
}
