import type {
  ClaimRecruitmentMailDeliveryResult,
  RecruitmentMailDeliveryRepository
} from '../../../application/ports/recruitment-mail-delivery-repository.port';
import { CommunicationPrismaService } from '../prisma/communication-prisma.service';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export class PrismaRecruitmentMailDeliveryRepository
  implements RecruitmentMailDeliveryRepository
{
  constructor(private readonly prismaService: CommunicationPrismaService) {}

  async claimDelivery(input: {
    deliveryId: string;
    eventName: string;
    now: Date;
    recipientIdentityId: string;
    sourceEventId: string;
    staleClaimCutoff: Date;
  }): Promise<ClaimRecruitmentMailDeliveryResult> {
    const existing = await this.prismaService.prisma.recruitmentMailDelivery.findUnique({
      where: {
        sourceEventId: input.sourceEventId
      }
    });

    if (existing?.status === 'sent' || existing?.sentAt) {
      return 'duplicate_sent';
    }

    const reclaimed = await this.prismaService.prisma.recruitmentMailDelivery.updateMany({
      data: {
        claimedAt: input.now,
        eventName: input.eventName,
        failedAt: null,
        lastError: null,
        recipientIdentityId: input.recipientIdentityId,
        status: 'claimed'
      },
      where: {
        sourceEventId: input.sourceEventId,
        sentAt: null,
        OR: [
          { status: 'failed' },
          {
            status: 'claimed',
            claimedAt: {
              lt: input.staleClaimCutoff
            }
          }
        ]
      }
    });

    if (reclaimed.count > 0) {
      return 'claimed';
    }

    if (!existing) {
      try {
        await this.prismaService.prisma.recruitmentMailDelivery.create({
          data: {
            claimedAt: input.now,
            eventName: input.eventName,
            id: input.deliveryId,
            recipientIdentityId: input.recipientIdentityId,
            sourceEventId: input.sourceEventId,
            status: 'claimed'
          }
        });
        return 'claimed';
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return this.claimDelivery(input);
        }

        throw error;
      }
    }

    if (existing.status === 'claimed') {
      return 'duplicate_in_flight';
    }

    return 'duplicate_in_flight';
  }

  async clearClaim(sourceEventId: string): Promise<void> {
    await this.prismaService.prisma.recruitmentMailDelivery.updateMany({
      data: {
        claimedAt: null,
        status: 'failed'
      },
      where: {
        sentAt: null,
        sourceEventId,
        status: 'claimed'
      }
    });
  }

  async markFailed(sourceEventId: string, failedAt: Date, lastError: string): Promise<void> {
    await this.prismaService.prisma.recruitmentMailDelivery.updateMany({
      data: {
        claimedAt: null,
        failedAt,
        lastError,
        status: 'failed'
      },
      where: {
        sentAt: null,
        sourceEventId
      }
    });
  }

  async markSent(sourceEventId: string, sentAt: Date): Promise<void> {
    await this.prismaService.prisma.recruitmentMailDelivery.updateMany({
      data: {
        claimedAt: null,
        failedAt: null,
        lastError: null,
        sentAt,
        status: 'sent'
      },
      where: {
        sourceEventId
      }
    });
  }
}
