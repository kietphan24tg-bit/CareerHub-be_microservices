import { DepartmentNameConflictError } from '../../errors/department-name-conflict.error';
import { DepartmentNotFoundError } from '../../errors/department-not-found.error';
import type { DepartmentRecord, DepartmentRepository } from '../../ports';
import { DepartmentAggregate } from '../../../domain/department';
import type { UpdateDepartmentCommand } from './update-department.command';

export class UpdateDepartmentCommandHandler {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(command: UpdateDepartmentCommand): Promise<DepartmentRecord> {
    const record = await this.departmentRepository.findById(command.id);

    if (!record) {
      throw new DepartmentNotFoundError(command.id);
    }

    if (command.name !== undefined && command.name.trim() !== record.name) {
      const nameConflict = await this.departmentRepository.existsByNameAndCompanyId(
        command.name,
        record.companyId,
        command.id
      );

      if (nameConflict) {
        throw new DepartmentNameConflictError(command.name);
      }
    }

    const department = DepartmentAggregate.reconstitute(record);
    department.update({ description: command.description, name: command.name });

    const updated = await this.departmentRepository.update(command.id, department.toUpdatePatch());

    return updated!;
  }
}
