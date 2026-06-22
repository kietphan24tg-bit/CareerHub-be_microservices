import { ApplicationError } from '@careerhub/infrastructure';

export class RegistrationRequestConflictError extends ApplicationError {
  constructor(requestId: string, status: string, sagaId: string) {
    super(
      `Registration request ${requestId} already exists with status ${status}`,
      {
        code: 'CONFLICT',
        details: {
          requestId,
          sagaId,
          status
        }
      }
    );
  }
}
