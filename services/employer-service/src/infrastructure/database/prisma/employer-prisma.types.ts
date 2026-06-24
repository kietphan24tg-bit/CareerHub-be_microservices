import type { PrismaClientLike } from '@careerhub/infrastructure';

export type EmployerProfilePersistenceRecord = {
  address: string | null;
  companyName: string;
  companySize: string | null;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: Date;
  description: string | null;
  foundedYear: number | null;
  id: string;
  identityId: string;
  industry: string | null;
  logoUrl: string | null;
  taxCode: string | null;
  updatedAt: Date;
  website: string | null;
};

export type EmployerProfileCreateInput = {
  address: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  id: string;
  identityId: string;
  industry: string;
};

export type EmployerProfileModelDelegate = {
  create(args: {
    data: EmployerProfileCreateInput;
  }): Promise<EmployerProfilePersistenceRecord>;
  deleteMany(args: {
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
  findUnique(args: {
    where: { identityId: string };
  }): Promise<EmployerProfilePersistenceRecord | null>;
  update(args: {
    data: Partial<EmployerProfilePersistenceRecord>;
    where: { id: string };
  }): Promise<EmployerProfilePersistenceRecord>;
};

export type DepartmentPersistenceRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
};

export type DepartmentModelDelegate = {
  create(args: {
    data: { companyId: string; description?: string | null; id: string; name: string };
  }): Promise<DepartmentPersistenceRecord>;
  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<DepartmentPersistenceRecord[]>;
  findUnique(args: {
    where: { id: string };
  }): Promise<DepartmentPersistenceRecord | null>;
  update(args: {
    data: Partial<DepartmentPersistenceRecord>;
    where: { id: string };
  }): Promise<DepartmentPersistenceRecord>;
  delete(args: { where: { id: string } }): Promise<DepartmentPersistenceRecord>;
  count(args: { where?: Record<string, unknown> }): Promise<number>;
};

export type EmployerPrismaClient = PrismaClientLike & {
  department: DepartmentModelDelegate;
  employerProfile: EmployerProfileModelDelegate;
};
