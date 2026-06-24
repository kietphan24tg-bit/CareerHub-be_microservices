import { ApplicationError } from '@careerhub/infrastructure';

export class DepartmentNotFoundError extends ApplicationError {
  constructor(id: string) {
    super(`Department not found: ${id}`, { code: 'NOT_FOUND' });
  }
}
