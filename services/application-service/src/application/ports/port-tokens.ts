export const APPLICATION_PORT_TOKENS = {
  applicationRepository: Symbol('APPLICATION_PORT_TOKENS.applicationRepository'),
  dashboardCache: Symbol('APPLICATION_PORT_TOKENS.dashboardCache'),
  idGenerator: Symbol('APPLICATION_PORT_TOKENS.idGenerator'),
  jobMailContextLookup: Symbol('APPLICATION_PORT_TOKENS.jobMailContextLookup'),
  outboxRepository: Symbol('APPLICATION_PORT_TOKENS.outboxRepository'),
  recruitmentRepository: Symbol('APPLICATION_PORT_TOKENS.recruitmentRepository'),
  writeTransaction: Symbol('APPLICATION_PORT_TOKENS.writeTransaction')
} as const;
