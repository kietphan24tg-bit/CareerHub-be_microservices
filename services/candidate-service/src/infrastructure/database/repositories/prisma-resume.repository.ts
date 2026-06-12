import type { ResumeRepository } from '../../../application';
import type { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import type { CandidatePrismaRepositoryClient } from '../prisma/candidate-prisma.types';
import { toResumeDomain, toResumePersistence } from './prisma-resume.mapper';

export class PrismaResumeRepository implements ResumeRepository {
  constructor(private readonly prismaClient: CandidatePrismaRepositoryClient) {}

  async clearIsUsingByIdentityId(
    identityId: string,
    exceptResumeId?: string
  ): Promise<void> {
    await this.prismaClient.resume.updateMany({
      data: { isUsing: false },
      where: {
        identityId,
        ...(exceptResumeId ? { id: { not: exceptResumeId } } : {})
      }
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prismaClient.resume.deleteMany({
      where: { id }
    });
  }

  async findById(id: string): Promise<ResumeAggregate | null> {
    const record = await this.prismaClient.resume.findUnique({
      where: { id }
    });

    return record ? toResumeDomain(record) : null;
  }

  async findByIdentityAndTemplateId(
    identityId: string,
    templateId: string
  ): Promise<ResumeAggregate | null> {
    const record = await this.prismaClient.resume.findFirst({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      where: {
        identityId,
        templateId
      }
    });

    return record ? toResumeDomain(record) : null;
  }

  async findByIdentityId(identityId: string): Promise<ResumeAggregate[]> {
    const records = await this.prismaClient.resume.findMany({
      orderBy: [{ isUsing: 'desc' }, { updatedAt: 'desc' }],
      where: { identityId }
    });

    return records.map((record) => toResumeDomain(record));
  }

  async save(resume: ResumeAggregate): Promise<void> {
    const data = toResumePersistence(resume);

    await this.prismaClient.resume.create({
      data: {
        content: data.content,
        id: data.id,
        identityId: data.identityId,
        isUsing: data.isUsing,
        templateId: data.templateId,
        title: data.title
      }
    });
  }

  async update(resume: ResumeAggregate): Promise<void> {
    const data = toResumePersistence(resume);

    await this.prismaClient.resume.update({
      data: {
        content: data.content,
        isUsing: data.isUsing,
        templateId: data.templateId,
        title: data.title
      },
      where: { id: data.id }
    });
  }
}
