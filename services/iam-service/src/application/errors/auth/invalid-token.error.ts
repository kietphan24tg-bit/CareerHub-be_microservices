import { ApplicationError } from '@careerhub/infrastructure';

export class InvalidTokenError extends ApplicationError {
  constructor(message = 'Invalid access token') {
    super(message, {
      code: 'UNAUTHORIZED'
    });
  }
}
