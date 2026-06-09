import type {
  CandidateProfileRecord,
  CandidateProfileRepository,
  UpdateCandidateProfilePatch
} from '../../../application';
import type {
  CandidateProfilePersistenceRecord,
  CandidatePrismaRepositoryClient
} from '../prisma/candidate-prisma.types';

export class PrismaCandidateProfileRepository
  implements CandidateProfileRepository
{
  constructor(private readonly prismaClient: CandidatePrismaRepositoryClient) {}

  private mapRecord(record: CandidateProfilePersistenceRecord): CandidateProfileRecord {
    return {
      address: record.address,
      avatarUrl: record.avatarUrl,
      bio: record.bio,
      createdAt: record.createdAt,
      fullName: record.fullName,
      githubUrl: record.githubUrl,
      headline: record.headline,
      id: record.id,
      identityId: record.identityId,
      linkedinUrl: record.linkedinUrl,
      phone: record.phone,
      portfolioUrl: record.portfolioUrl,
      updatedAt: record.updatedAt,
      yearsExperience: record.yearsExperience
    };
  }

  async existsByIdentityId(identityId: string): Promise<boolean> {
    return (
      await this.prismaClient.candidateProfile.findUnique({
        where: {
          identityId
        }
      })
    ) !== null;
  }

  async findByIdentityId(
    identityId: string
  ): Promise<CandidateProfileRecord | null> {
    const record = await this.prismaClient.candidateProfile.findUnique({
      where: {
        identityId
      }
    });

    return record ? this.mapRecord(record) : null;
  }

  async save(profile: {
    fullName: string;
    id: string;
    identityId: string;
    phone: string | null;
  }): Promise<void> {
    await this.prismaClient.candidateProfile.create({
      data: profile
    });
  }

  async updateByIdentityId(
    identityId: string,
    patch: UpdateCandidateProfilePatch
  ): Promise<CandidateProfileRecord | null> {
    const existing = await this.prismaClient.candidateProfile.findUnique({
      where: {
        identityId
      }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prismaClient.candidateProfile.update({
      data: patch,
      where: {
        id: existing.id
      }
    });

    return this.mapRecord(updated);
  }
}
