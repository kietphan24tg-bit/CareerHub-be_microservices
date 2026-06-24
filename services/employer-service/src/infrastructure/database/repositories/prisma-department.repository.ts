import type {
  CreateDepartmentRecord,
  DepartmentRecord,
  DepartmentRepository,
  UpdateDepartmentPatch
} from '../../../application/ports';
import type { DepartmentPersistenceRecord } from '../prisma/employer-prisma.types';
import { EmployerPrismaService } from '../prisma/employer-prisma.service';

export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly prismaService: EmployerPrismaService) {}

  private mapRecord(record: DepartmentPersistenceRecord): DepartmentRecord {
    return {
      companyId: record.companyId,
      createdAt: record.createdAt,
      description: record.description,
      id: record.id,
      name: record.name,
      updatedAt: record.updatedAt
    };
  }

  async findById(id: string): Promise<DepartmentRecord | null> {
    const record = await this.prismaService.prisma.department.findUnique({
      where: { id }
    });

    return record ? this.mapRecord(record) : null;
  }

  async findByCompanyId(companyId: string): Promise<DepartmentRecord[]> {
    const records = await this.prismaService.prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    return records.map((r) => this.mapRecord(r));
  }

  async existsByNameAndCompanyId(
    name: string,
    companyId: string,
    excludeId?: string
  ): Promise<boolean> {
    const where: Record<string, unknown> = {
      name: { equals: name, mode: 'insensitive' },
      companyId
    };

    if (excludeId) {
      where['NOT'] = { id: excludeId };
    }

    const count = await this.prismaService.prisma.department.count({ where });

    return count > 0;
  }

  async save(record: CreateDepartmentRecord): Promise<void> {
    await this.prismaService.prisma.department.create({
      data: {
        companyId: record.companyId,
        description: record.description,
        id: record.id,
        name: record.name
      }
    });
  }

  async update(id: string, patch: UpdateDepartmentPatch): Promise<DepartmentRecord | null> {
    const existing = await this.prismaService.prisma.department.findUnique({
      where: { id }
    });

    if (!existing) return null;

    const updated = await this.prismaService.prisma.department.update({
      data: patch,
      where: { id }
    });

    return this.mapRecord(updated);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prismaService.prisma.department.findUnique({
      where: { id }
    });

    if (!existing) return false;

    await this.prismaService.prisma.department.delete({ where: { id } });

    return true;
  }
}
