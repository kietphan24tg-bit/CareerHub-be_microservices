import { ApplicationError } from '@careerhub/infrastructure';

export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('Invalid email or password', {
      code: 'UNAUTHORIZED'
    });
  }
}
