export const IAM_PORT_TOKENS = {
  authSessionRepository: Symbol('IAM_PORT_TOKENS.authSessionRepository'),
  idGenerator: Symbol('IAM_PORT_TOKENS.idGenerator'),
  identityRepository: Symbol('IAM_PORT_TOKENS.identityRepository'),
  passwordHasher: Symbol('IAM_PORT_TOKENS.passwordHasher'),
  tokenService: Symbol('IAM_PORT_TOKENS.tokenService')
} as const;
