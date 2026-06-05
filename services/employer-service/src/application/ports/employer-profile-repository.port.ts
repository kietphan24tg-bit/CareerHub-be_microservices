export type EmployerProfileRecord = {
  address: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  id: string;
  identityId: string;
  industry: string;
};

export type CreateEmployerProfileRecord = EmployerProfileRecord;

export interface EmployerProfileRepository {
  existsByIdentityId(identityId: string): Promise<boolean>;
  save(profile: CreateEmployerProfileRecord): Promise<void>;
}
