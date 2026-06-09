import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
  PasswordResetTokenRepository
} from '../../../application';
import type { IamPrismaRepositoryClient } from '../prisma/iam-prisma.types';

export class PrismaPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  constructor(private readonly prismaClient: IamPrismaRepositoryClient) {}

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    await this.prismaClient.passwordResetToken.create({
      data: input
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const token = await this.prismaClient.passwordResetToken.findUnique({
      where: {
        tokenHash
      }
    });

    if (!token) {
      return null;
    }

    return {
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      id: token.id,
      identityId: token.identityId,
      tokenHash: token.tokenHash,
      usedAt: token.usedAt ?? undefined
    };
  }

  async invalidateActiveForIdentity(
    identityId: string,
    usedAt: Date
  ): Promise<number> {
    const result = await this.prismaClient.passwordResetToken.updateMany({
      data: {
        usedAt
      },
      where: {
        expiresAt: {
          gt: usedAt
        },
        identityId,
        usedAt: null
      }
    });

    return result.count;
  }

  async markUsed(tokenId: string, usedAt: Date): Promise<void> {
    await this.prismaClient.passwordResetToken.update({
      data: {
        usedAt
      },
      where: {
        id: tokenId
      }
    });
  }
}
