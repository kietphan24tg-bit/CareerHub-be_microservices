export type UpdateEmployerProfileCommand = {
  address?: string | null;
  companyName?: string;
  companySize?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  foundedYear?: number | null;
  identityId: string;
  industry?: string | null;
  logoUrl?: string | null;
  taxCode?: string | null;
  website?: string | null;
};
