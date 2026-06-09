export const IAM_PORT_TOKENS = {
  authSessionRepository: Symbol('IAM_PORT_TOKENS.authSessionRepository'),
  idGenerator: Symbol('IAM_PORT_TOKENS.idGenerator'),
  identityRepository: Symbol('IAM_PORT_TOKENS.identityRepository'),
  outboxRepository: Symbol('IAM_PORT_TOKENS.outboxRepository'),
  passwordHasher: Symbol('IAM_PORT_TOKENS.passwordHasher'),
  passwordResetTokenRepository: Symbol(
    'IAM_PORT_TOKENS.passwordResetTokenRepository'
  ),
  tokenService: Symbol('IAM_PORT_TOKENS.tokenService'),
  writeTransaction: Symbol('IAM_PORT_TOKENS.writeTransaction')
} as const;
