export const IAM_PORT_TOKENS = {
  idGenerator: Symbol('IAM_PORT_TOKENS.idGenerator'),
  identityRepository: Symbol('IAM_PORT_TOKENS.identityRepository'),
  passwordHasher: Symbol('IAM_PORT_TOKENS.passwordHasher')
} as const;
