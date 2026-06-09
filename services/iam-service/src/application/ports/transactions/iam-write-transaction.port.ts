import type { AuthSessionRepository } from '../auth/auth-session-repository.port';
import type { PasswordResetTokenRepository } from '../auth/password-reset-token-repository.port';
import type { OutboxRepository } from '../outbox/outbox-repository.port';
import type { IdentityRepository } from '../identity/identity-repository.port';

export type IamWriteTransactionContext = {
  authSessionRepository: AuthSessionRepository;
  identityRepository: IdentityRepository;
  outboxRepository: OutboxRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
};

export interface IamWriteTransaction {
  execute<T>(
    work: (context: IamWriteTransactionContext) => Promise<T>
  ): Promise<T>;
}
