import { ApplicationError } from '@careerhub/nest-common';

export class InvalidRefreshTokenError extends ApplicationError {
  constructor(message = 'Invalid refresh token') {
    super(message, {
      code: 'UNAUTHORIZED'
    });
  }
}
