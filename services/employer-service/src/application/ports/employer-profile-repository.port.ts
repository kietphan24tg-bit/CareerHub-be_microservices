export type EmployerProfileRecord = {
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

export type CreateEmployerProfileRecord = {
  address: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  id: string;
  identityId: string;
  industry: string;
};

export type UpdateEmployerProfilePatch = {
  address?: string | null;
  companyName?: string;
  companySize?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  foundedYear?: number | null;
  industry?: string | null;
  logoUrl?: string | null;
  taxCode?: string | null;
  website?: string | null;
};

export interface EmployerProfileRepository {
  existsByIdentityId(identityId: string): Promise<boolean>;
  findByIdentityId(identityId: string): Promise<EmployerProfileRecord | null>;
  save(profile: CreateEmployerProfileRecord): Promise<void>;
  updateByIdentityId(
    identityId: string,
    patch: UpdateEmployerProfilePatch
  ): Promise<EmployerProfileRecord | null>;
}
