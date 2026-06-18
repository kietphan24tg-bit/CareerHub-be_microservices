export const JOB_PORT_TOKENS = {
  idGenerator: Symbol('JOB_PORT_TOKENS.idGenerator'),
  jobRepository: Symbol('JOB_PORT_TOKENS.jobRepository'),
  jobSearchCache: Symbol('JOB_PORT_TOKENS.jobSearchCache'),
  jobSearchIndexer: Symbol('JOB_PORT_TOKENS.jobSearchIndexer'),
  jobSearchRepository: Symbol('JOB_PORT_TOKENS.jobSearchRepository'),
  outboxRepository: Symbol('JOB_PORT_TOKENS.outboxRepository'),
  slugCache: Symbol('JOB_PORT_TOKENS.slugCache')
} as const;
