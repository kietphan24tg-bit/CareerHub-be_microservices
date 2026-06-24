export type ListEmployerOffersQuery = {
  employerIdentityId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  workModel?: string;
};