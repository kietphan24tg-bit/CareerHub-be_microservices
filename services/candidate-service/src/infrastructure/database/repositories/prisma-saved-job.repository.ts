import type {
  SavedJobRecord,
  SavedJobRepository
} from '../../../application';
import type { CandidatePrismaRepositoryClient } from '../prisma/candidate-prisma.types';

export class PrismaSavedJobRepository implements SavedJobRepository {
  constructor(private readonly prismaClient: CandidatePrismaRepositoryClient) {}

  async deleteByIdentityAndJobId(
    identityId: string,
    jobId: string
  ): Promise<void> {
    await this.prismaClient.savedJob.deleteMany({
      where: {
        identityId,
        jobId
      }
    });
  }

  async findByIdentityAndJobId(
    identityId: string,
    jobId: string
  ): Promise<SavedJobRecord | null> {
    const record = await this.prismaClient.savedJob.findUnique({
      where: {
        identityId_jobId: {
          identityId,
          jobId
        }
      }
    });

    return record ?? null;
  }

  async findByIdentityId(identityId: string): Promise<SavedJobRecord[]> {
    return this.prismaClient.savedJob.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      where: {
        identityId
      }
    });
  }

  async save(record: SavedJobRecord): Promise<SavedJobRecord> {
    return this.prismaClient.savedJob.create({
      data: {
        createdAt: record.createdAt,
        id: record.id,
        identityId: record.identityId,
        jobId: record.jobId
      }
    });
  }
}
