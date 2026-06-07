import { ApplicationError } from '@careerhub/infrastructure';

export class InvalidRefreshTokenError extends ApplicationError {
  constructor(message = 'Invalid refresh token') {
    super(message, {
      code: 'UNAUTHORIZED'
    });
  }
}
