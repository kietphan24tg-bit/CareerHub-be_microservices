export type DepartmentRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
};

export type CreateDepartmentRecord = {
  companyId: string;
  description: string | null;
  id: string;
  name: string;
};

export type UpdateDepartmentPatch = {
  description?: string | null;
  name?: string;
};

export interface DepartmentRepository {
  findById(id: string): Promise<DepartmentRecord | null>;
  findByCompanyId(companyId: string): Promise<DepartmentRecord[]>;
  existsByNameAndCompanyId(name: string, companyId: string, excludeId?: string): Promise<boolean>;
  save(record: CreateDepartmentRecord): Promise<void>;
  update(id: string, patch: UpdateDepartmentPatch): Promise<DepartmentRecord | null>;
  delete(id: string): Promise<boolean>;
}
