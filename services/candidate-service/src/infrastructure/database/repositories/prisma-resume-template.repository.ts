import type {
  ResumeTemplateListItemRecord,
  ResumeTemplateRecord,
  ResumeTemplateRepository
} from '../../../application';
import type { CandidatePrismaRepositoryClient } from '../prisma/candidate-prisma.types';

function toLayoutData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export class PrismaResumeTemplateRepository implements ResumeTemplateRepository {
  constructor(private readonly prismaClient: CandidatePrismaRepositoryClient) {}

  async findActiveById(templateId: string): Promise<ResumeTemplateRecord | null> {
    const record = await this.prismaClient.resumeTemplate.findFirst({
      where: {
        id: templateId,
        isActive: true
      }
    });

    if (!record) {
      return null;
    }

    return {
      category: record.category,
      createdAt: record.createdAt,
      id: record.id,
      isActive: record.isActive,
      layoutData: toLayoutData(record.layoutData),
      name: record.name,
      thumbnail: record.thumbnail
    };
  }

  async listActive(): Promise<ResumeTemplateListItemRecord[]> {
    const records = await this.prismaClient.resumeTemplate.findMany({
      orderBy: { id: 'asc' },
      select: {
        category: true,
        id: true,
        name: true,
        thumbnail: true
      },
      where: {
        isActive: true
      }
    });

    return records as ResumeTemplateListItemRecord[];
  }
}
