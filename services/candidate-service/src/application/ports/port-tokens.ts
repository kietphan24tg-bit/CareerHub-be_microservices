export const CANDIDATE_PORT_TOKENS = {
  candidateProfileRepository: Symbol('CANDIDATE_PORT_TOKENS.candidateProfileRepository'),
  idGenerator: Symbol('CANDIDATE_PORT_TOKENS.idGenerator'),
  outboxRepository: Symbol('CANDIDATE_PORT_TOKENS.outboxRepository'),
  writeTransaction: Symbol('CANDIDATE_PORT_TOKENS.writeTransaction')
} as const;
