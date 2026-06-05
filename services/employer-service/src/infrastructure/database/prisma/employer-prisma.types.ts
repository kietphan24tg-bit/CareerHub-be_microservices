import type { PrismaClientLike } from '@careerhub/nest-common';

export type EmployerProfilePersistenceRecord = {
  address: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  createdAt: Date;
  id: string;
  identityId: string;
  industry: string;
  updatedAt: Date;
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
};

export type EmployerPrismaClient = PrismaClientLike & {
  employerProfile: EmployerProfileModelDelegate;
};
