import { PasswordHash } from '../../../domain';
import { InvalidPasswordResetTokenError } from '../../errors';
import type {
  IamWriteTransaction,
  PasswordHasher,
  PasswordResetTokenRepository,
  TokenService
} from '../../ports';
import type { IdentityRepository } from '../../ports/identity/identity-repository.port';
import type { ResetPasswordCommand } from './reset-password.command';

export class ResetPasswordCommandHandler {
  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly identityRepository: IdentityRepository,
    private readonly writeTransaction: IamWriteTransaction,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(command: ResetPasswordCommand): Promise<{ passwordReset: true }> {
    const tokenHash = this.tokenService.hashRefreshToken(command.token);
    const resetToken =
      await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
    const now = new Date();

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= now.getTime()
    ) {
      throw new InvalidPasswordResetTokenError();
    }

    const identity = await this.identityRepository.findById(resetToken.identityId);

    if (!identity) {
      throw new InvalidPasswordResetTokenError();
    }

    const nextPasswordHash = new PasswordHash(
      await this.passwordHasher.hash(command.newPassword)
    );

    identity.changePassword(nextPasswordHash);

    await this.writeTransaction.execute(
      async ({
        authSessionRepository,
        identityRepository,
        passwordResetTokenRepository
      }) => {
        await identityRepository.update(identity);
        await passwordResetTokenRepository.markUsed(resetToken.id, now);
        await passwordResetTokenRepository.invalidateActiveForIdentity(
          identity.id.toString(),
          now
        );
        await authSessionRepository.revokeByIdentityId(identity.id.toString(), now);
      }
    );

    return {
      passwordReset: true
    };
  }
}
