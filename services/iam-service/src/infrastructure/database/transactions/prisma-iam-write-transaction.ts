import type { IamWriteTransaction } from '../../../application';
import { PrismaAuthSessionRepository } from '../repositories/prisma-auth-session.repository';
import { PrismaIdentityRepository } from '../repositories/prisma-identity.repository';
import { PrismaOutboxRepository } from '../repositories/prisma-outbox.repository';
import { PrismaPasswordResetTokenRepository } from '../repositories/prisma-password-reset-token.repository';
import { IamPrismaService } from '../prisma/iam-prisma.service';

export class PrismaIamWriteTransaction implements IamWriteTransaction {
  constructor(private readonly prismaService: IamPrismaService) {}

  async execute<T>(
    work: Parameters<IamWriteTransaction['execute']>[0]
  ): Promise<T> {
    return (await this.prismaService.transaction(async (prismaClient) =>
      work({
        authSessionRepository: new PrismaAuthSessionRepository(prismaClient),
        identityRepository: new PrismaIdentityRepository(prismaClient),
        outboxRepository: new PrismaOutboxRepository(prismaClient),
        passwordResetTokenRepository: new PrismaPasswordResetTokenRepository(
          prismaClient
        )
      })
    )) as T;
  }
}
