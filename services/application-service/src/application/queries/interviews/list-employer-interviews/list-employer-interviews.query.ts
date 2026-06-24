export type ListEmployerInterviewsQuery = {
  employerIdentityId: string;
  status?: string;
  type?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};
