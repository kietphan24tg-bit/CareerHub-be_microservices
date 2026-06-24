import { ApplicationError } from '@careerhub/infrastructure';

export class DepartmentNameConflictError extends ApplicationError {
  constructor(name: string) {
    super(`Department with name "${name}" already exists in this company`, {
      code: 'CONFLICT'
    });
  }
}
