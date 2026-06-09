import type { CandidateWriteTransaction } from '../../../application';
import { PrismaCandidateProfileRepository } from '../repositories/prisma-candidate-profile.repository';
import { PrismaCandidateOutboxRepository } from '../repositories/prisma-outbox.repository';
import { CandidatePrismaService } from '../prisma/candidate-prisma.service';

export class PrismaCandidateWriteTransaction implements CandidateWriteTransaction {
  constructor(private readonly prismaService: CandidatePrismaService) {}

  async execute<T>(
    work: Parameters<CandidateWriteTransaction['execute']>[0]
  ): Promise<T> {
    return (await this.prismaService.transaction(async (prismaClient) =>
      work({
        candidateProfileRepository: new PrismaCandidateProfileRepository(prismaClient),
        outboxRepository: new PrismaCandidateOutboxRepository(prismaClient)
      })
    )) as T;
  }
}
