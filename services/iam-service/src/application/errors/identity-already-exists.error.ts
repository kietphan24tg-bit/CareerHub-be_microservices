export class IdentityAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Identity already exists for email: ${email}`);
    this.name = 'IdentityAlreadyExistsError';
  }
}
