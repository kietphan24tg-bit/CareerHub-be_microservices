import { ApplicationError } from '@careerhub/nest-common';

export class InvalidTokenError extends ApplicationError {
  constructor(message = 'Invalid access token') {
    super(message, {
      code: 'UNAUTHORIZED'
    });
  }
}
