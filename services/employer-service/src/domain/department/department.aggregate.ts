import {
  AggregateRoot,
  type CreateEntityProps,
  UniqueEntityID,
  ValidationError
} from '@careerhub/shared-kernel';
import type { CreateDepartmentRecord, UpdateDepartmentPatch } from '../../application/ports';

type DepartmentProps = {
  companyId: string;
  description: string | null;
  name: string;
};

type ReconstituteDepartmentProps = CreateEntityProps<DepartmentProps>;

export class DepartmentAggregate extends AggregateRoot<DepartmentProps> {
  private readonly propsRef: DepartmentProps;

  private constructor(props: ReconstituteDepartmentProps) {
    super(props);
    this.propsRef = props.props;
  }

  static create(input: {
    companyId: string;
    description?: string | null;
    id: string;
    name: string;
    createdAt?: Date;
  }): DepartmentAggregate {
    const now = input.createdAt ?? new Date();
    const normalizedName = input.name.trim();

    if (!normalizedName) {
      throw new ValidationError('Department name is required');
    }

    if (!input.companyId.trim()) {
      throw new ValidationError('Department company id is required');
    }

    return new DepartmentAggregate({
      createdAt: now,
      id: new UniqueEntityID(input.id),
      props: {
        companyId: input.companyId.trim(),
        description: input.description?.trim() || null,
        name: normalizedName
      },
      updatedAt: now
    });
  }

  static reconstitute(record: {
    companyId: string;
    createdAt: Date;
    description: string | null;
    id: string;
    name: string;
    updatedAt: Date;
  }): DepartmentAggregate {
    return new DepartmentAggregate({
      createdAt: record.createdAt,
      id: new UniqueEntityID(record.id),
      props: {
        companyId: record.companyId,
        description: record.description,
        name: record.name
      },
      updatedAt: record.updatedAt
    });
  }

  get companyId(): string {
    return this.propsRef.companyId;
  }

  update(input: { description?: string | null; name?: string }): void {
    if (input.name !== undefined) {
      const normalized = input.name.trim();
      if (!normalized) {
        throw new ValidationError('Department name is required');
      }
      this.propsRef.name = normalized;
    }

    if (input.description !== undefined) {
      this.propsRef.description = input.description?.trim() || null;
    }
  }

  toCreateRecord(): CreateDepartmentRecord {
    return {
      companyId: this.propsRef.companyId,
      description: this.propsRef.description,
      id: this.id.toString(),
      name: this.propsRef.name
    };
  }

  toUpdatePatch(): UpdateDepartmentPatch {
    return {
      description: this.propsRef.description,
      name: this.propsRef.name
    };
  }

  validate(): void {
    const props = this.getProps();

    if (!props.name.trim()) {
      throw new ValidationError('Department name is required');
    }

    if (!props.companyId.trim()) {
      throw new ValidationError('Department company id is required');
    }
  }
}
