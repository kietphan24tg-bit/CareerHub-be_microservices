import { ApplicationError } from '@careerhub/nest-common';

export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('Invalid email or password', {
      code: 'UNAUTHORIZED'
    });
  }
}
