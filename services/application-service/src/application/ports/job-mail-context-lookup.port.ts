export type JobMailContext = {
  companyName: string;
  jobTitle: string;
};

export type JobMailContextLookup = {
  findByJobId(jobId: string, requestId?: string): Promise<JobMailContext | null>;
};
