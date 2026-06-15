import type { ApplicationWriteTransaction } from '../../../application';
import { PrismaApplicationRepository } from '../repositories/prisma-application.repository';
import { PrismaApplicationOutboxRepository } from '../repositories/prisma-application-outbox.repository';
import { PrismaRecruitmentRepository } from '../repositories/prisma-recruitment.repository';
import { ApplicationPrismaService } from '../prisma/application-prisma.service';

export class PrismaApplicationWriteTransaction implements ApplicationWriteTransaction {
  constructor(private readonly prismaService: ApplicationPrismaService) {}

  async execute<T>(
    work: Parameters<ApplicationWriteTransaction['execute']>[0]
  ): Promise<T> {
    return (await this.prismaService.transaction(async (prismaClient) =>
      work({
        applicationRepository: new PrismaApplicationRepository(prismaClient),
        outboxRepository: new PrismaApplicationOutboxRepository(prismaClient),
        recruitmentRepository: new PrismaRecruitmentRepository(prismaClient)
      })
    )) as T;
  }
}
