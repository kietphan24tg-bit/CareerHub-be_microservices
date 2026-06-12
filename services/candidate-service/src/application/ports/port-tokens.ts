export const CANDIDATE_PORT_TOKENS = {
  candidateProfileRepository: Symbol('CANDIDATE_PORT_TOKENS.candidateProfileRepository'),
  idGenerator: Symbol('CANDIDATE_PORT_TOKENS.idGenerator'),
  outboxRepository: Symbol('CANDIDATE_PORT_TOKENS.outboxRepository'),
  resumeRepository: Symbol('CANDIDATE_PORT_TOKENS.resumeRepository'),
  resumeTemplateRepository: Symbol('CANDIDATE_PORT_TOKENS.resumeTemplateRepository'),
  savedJobRepository: Symbol('CANDIDATE_PORT_TOKENS.savedJobRepository'),
  writeTransaction: Symbol('CANDIDATE_PORT_TOKENS.writeTransaction')
} as const;
