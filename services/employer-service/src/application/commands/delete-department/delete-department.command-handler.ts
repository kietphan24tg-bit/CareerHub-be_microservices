import { DepartmentNotFoundError } from '../../errors/department-not-found.error';
import type { DepartmentRepository } from '../../ports';
import type { DeleteDepartmentCommand } from './delete-department.command';

export class DeleteDepartmentCommandHandler {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(command: DeleteDepartmentCommand): Promise<void> {
    const deleted = await this.departmentRepository.delete(command.id);

    if (!deleted) {
      throw new DepartmentNotFoundError(command.id);
    }
  }
}
