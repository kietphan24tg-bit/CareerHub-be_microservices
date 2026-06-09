import { Logger } from '@nestjs/common';
import { Email } from '../../../domain';
import type {
  IdGenerator,
  IamWriteTransaction,
  IdentityRepository,
  PasswordResetTokenGenerator,
  TokenService
} from '../../ports';
import { mapPasswordResetRequestedToOutboxRecord } from '../../outbox/iam-outbox-event.mapper';
import type { RequestPasswordResetCommand } from './request-password-reset.command';
import type { RequestPasswordResetResult } from './request-password-reset.result';

export class RequestPasswordResetCommandHandler {
  private readonly logger = new Logger(RequestPasswordResetCommandHandler.name);

  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly writeTransaction: IamWriteTransaction,
    private readonly idGenerator: IdGenerator,
    private readonly tokenService: TokenService,
    private readonly passwordResetTokenGenerator: PasswordResetTokenGenerator,
    private readonly passwordResetTokenTtlMs: number
  ) {}

  async execute(
    command: RequestPasswordResetCommand
  ): Promise<RequestPasswordResetResult> {
    const email = new Email(command.email);
    const identity = await this.identityRepository.findByEmail(email);

    if (!identity) {
      this.logger.log('Password reset requested for unknown email', {
        email: email.value,
        requestId: command.requestId
      });
      return { accepted: true };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.passwordResetTokenTtlMs);
    const resetTokenId = this.idGenerator.generate();
    const expiresAtIso = expiresAt.toISOString();
    const resetToken = this.passwordResetTokenGenerator.createToken({
      expiresAt: expiresAtIso,
      identityId: identity.id.toString(),
      tokenId: resetTokenId
    });
    const occurredAt = now.toISOString();

    await this.writeTransaction.execute(
      async ({ outboxRepository, passwordResetTokenRepository }) => {
        await passwordResetTokenRepository.invalidateActiveForIdentity(
          identity.id.toString(),
          now
        );
        await passwordResetTokenRepository.create({
          expiresAt,
          id: resetTokenId,
          identityId: identity.id.toString(),
          tokenHash: this.tokenService.hashRefreshToken(resetToken)
        });
        await outboxRepository.create(
          mapPasswordResetRequestedToOutboxRecord(
            {
              email: identity.email.value,
              expiresAt: expiresAtIso,
              identityId: identity.id.toString(),
              occurredAt,
              requestId: command.requestId,
              resetTokenId
            },
            {
              createId: () => this.idGenerator.generate()
            }
          )
        );
      }
    );

    this.logger.log('Password reset requested', {
      email: identity.email.value,
      identityId: identity.id.toString(),
      requestId: command.requestId
    });

    return {
      accepted: true
    };
  }
}
