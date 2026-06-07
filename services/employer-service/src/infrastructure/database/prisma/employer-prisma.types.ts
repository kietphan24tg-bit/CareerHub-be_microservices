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
  findUnique(args: {
    where: { identityId: string };
  }): Promise<EmployerProfilePersistenceRecord | null>;
  update(args: {
    data: Partial<EmployerProfilePersistenceRecord>;
    where: { id: string };
  }): Promise<EmployerProfilePersistenceRecord>;
};

export type EmployerPrismaClient = PrismaClientLike & {
  employerProfile: EmployerProfileModelDelegate;
};
