import type { DepartmentRecord, DepartmentRepository } from '../../ports';
import type { ListDepartmentsByCompanyQuery } from './list-departments-by-company.query';

export class ListDepartmentsByCompanyQueryHandler {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(query: ListDepartmentsByCompanyQuery): Promise<DepartmentRecord[]> {
    return this.departmentRepository.findByCompanyId(query.companyId);
  }
}
