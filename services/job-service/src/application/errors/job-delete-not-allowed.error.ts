import { ApplicationError } from '@careerhub/infrastructure';

export class JobDeleteNotAllowedError extends ApplicationError {
  constructor(status: string) {
    super(`Only draft jobs can be deleted. Current status: ${status}.`, {
      code: 'JOB_DELETE_NOT_ALLOWED'
    });
  }
}
