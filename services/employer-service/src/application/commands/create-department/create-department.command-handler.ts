import { DepartmentNameConflictError } from '../../errors/department-name-conflict.error';
import type { DepartmentRepository, IdGenerator } from '../../ports';
import { DepartmentAggregate } from '../../../domain/department';
import type { CreateDepartmentCommand } from './create-department.command';
import type { CreateDepartmentResult } from './create-department.result';

export class CreateDepartmentCommandHandler {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(command: CreateDepartmentCommand): Promise<CreateDepartmentResult> {
    const nameConflict = await this.departmentRepository.existsByNameAndCompanyId(
      command.name,
      command.companyId
    );

    if (nameConflict) {
      throw new DepartmentNameConflictError(command.name);
    }

    const department = DepartmentAggregate.create({
      companyId: command.companyId,
      description: command.description,
      id: this.idGenerator.generate(),
      name: command.name
    });

    await this.departmentRepository.save(department.toCreateRecord());

    const record = await this.departmentRepository.findById(department.id.toString());

    return record!;
  }
}
