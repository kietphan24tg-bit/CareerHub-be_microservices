import {
  AggregateRoot,
  type CreateEntityProps,
  UniqueEntityID,
  ValidationError
} from '@careerhub/shared-kernel';
import type {
  CreateEmployerProfileRecord,
  EmployerProfileRecord,
  UpdateEmployerProfilePatch
} from '../../application/ports';
import { CompanyName, TaxCode } from './value-objects';

type EmployerProfileProps = {
  address: string | null;
  companyName: CompanyName;
  companySize: string | null;
  contactName: string | null;
  contactPhone: string | null;
  description: string | null;
  foundedYear: number | null;
  identityId: string;
  industry: string | null;
  logoUrl: string | null;
  taxCode: TaxCode | null;
  website: string | null;
};

type ReconstituteEmployerProfileProps = CreateEntityProps<EmployerProfileProps>;

type UpdateEmployerProfileInput = {
  address?: string | null;
  companyName?: string;
  companySize?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  foundedYear?: number | null;
  industry?: string | null;
  logoUrl?: string | null;
  taxCode?: string | null;
  website?: string | null;
};

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeNullableString(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export class EmployerProfileAggregate extends AggregateRoot<EmployerProfileProps> {
  private readonly propsRef: EmployerProfileProps;

  private constructor(props: ReconstituteEmployerProfileProps) {
    super(props);
    this.propsRef = props.props;
  }

  static create(input: {
    address: string;
    companyName: string;
    contactName: string;
    contactPhone: string;
    id: string;
    identityId: string;
    industry: string;
    createdAt?: Date;
  }): EmployerProfileAggregate {
    const now = input.createdAt ?? new Date();

    return new EmployerProfileAggregate({
      createdAt: now,
      id: new UniqueEntityID(input.id),
      props: {
        address: normalizeRequiredString(input.address, 'Employer address'),
        companyName: CompanyName.create(input.companyName),
        companySize: null,
        contactName: normalizeRequiredString(input.contactName, 'Employer contact name'),
        contactPhone: normalizeRequiredString(input.contactPhone, 'Employer contact phone'),
        description: null,
        foundedYear: null,
        identityId: normalizeRequiredString(input.identityId, 'Employer identity id'),
        industry: normalizeRequiredString(input.industry, 'Employer industry'),
        logoUrl: null,
        taxCode: null,
        website: null
      },
      updatedAt: now
    });
  }

  static reconstitute(record: EmployerProfileRecord): EmployerProfileAggregate {
    return new EmployerProfileAggregate({
      createdAt: record.createdAt,
      id: new UniqueEntityID(record.id),
      props: {
        address: record.address,
        companyName: CompanyName.create(record.companyName),
        companySize: record.companySize,
        contactName: record.contactName,
        contactPhone: record.contactPhone,
        description: record.description,
        foundedYear: record.foundedYear,
        identityId: normalizeRequiredString(record.identityId, 'Employer identity id'),
        industry: record.industry,
        logoUrl: record.logoUrl,
        taxCode: record.taxCode ? TaxCode.create(record.taxCode) : null,
        website: record.website
      },
      updatedAt: record.updatedAt
    });
  }

  get identityId(): string {
    return this.propsRef.identityId;
  }

  update(input: UpdateEmployerProfileInput): void {
    if (input.companyName !== undefined) {
      this.propsRef.companyName = CompanyName.create(input.companyName);
    }

    if (input.logoUrl !== undefined) {
      this.propsRef.logoUrl = normalizeNullableString(input.logoUrl) ?? null;
    }

    if (input.website !== undefined) {
      this.propsRef.website = normalizeNullableString(input.website) ?? null;
    }

    if (input.industry !== undefined) {
      this.propsRef.industry = normalizeNullableString(input.industry) ?? null;
    }

    if (input.companySize !== undefined) {
      this.propsRef.companySize = normalizeNullableString(input.companySize) ?? null;
    }

    if (input.foundedYear !== undefined) {
      if (input.foundedYear !== null && (input.foundedYear < 1800 || input.foundedYear > 2100)) {
        throw new ValidationError('Employer founded year must be between 1800 and 2100');
      }

      this.propsRef.foundedYear = input.foundedYear;
    }

    if (input.description !== undefined) {
      this.propsRef.description = normalizeNullableString(input.description) ?? null;
    }

    if (input.address !== undefined) {
      this.propsRef.address = normalizeNullableString(input.address) ?? null;
    }

    if (input.taxCode !== undefined) {
      const normalized = normalizeNullableString(input.taxCode);
      this.propsRef.taxCode = normalized ? TaxCode.create(normalized) : null;
    }

    if (input.contactName !== undefined) {
      this.propsRef.contactName = normalizeNullableString(input.contactName) ?? null;
    }

    if (input.contactPhone !== undefined) {
      this.propsRef.contactPhone = normalizeNullableString(input.contactPhone) ?? null;
    }
  }

  toCreateRecord(): CreateEmployerProfileRecord {
    return {
      address: this.propsRef.address ?? '',
      companyName: this.propsRef.companyName.value,
      contactName: this.propsRef.contactName ?? '',
      contactPhone: this.propsRef.contactPhone ?? '',
      id: this.id.toString(),
      identityId: this.propsRef.identityId,
      industry: this.propsRef.industry ?? ''
    };
  }

  toUpdatePatch(fields: ReadonlyArray<keyof UpdateEmployerProfilePatch>): UpdateEmployerProfilePatch {
    const patch: UpdateEmployerProfilePatch = {};

    for (const field of fields) {
      switch (field) {
        case 'address':
          patch.address = this.propsRef.address;
          break;
        case 'companyName':
          patch.companyName = this.propsRef.companyName.value;
          break;
        case 'companySize':
          patch.companySize = this.propsRef.companySize;
          break;
        case 'contactName':
          patch.contactName = this.propsRef.contactName;
          break;
        case 'contactPhone':
          patch.contactPhone = this.propsRef.contactPhone;
          break;
        case 'description':
          patch.description = this.propsRef.description;
          break;
        case 'foundedYear':
          patch.foundedYear = this.propsRef.foundedYear;
          break;
        case 'industry':
          patch.industry = this.propsRef.industry;
          break;
        case 'logoUrl':
          patch.logoUrl = this.propsRef.logoUrl;
          break;
        case 'taxCode':
          patch.taxCode = this.propsRef.taxCode?.value ?? null;
          break;
        case 'website':
          patch.website = this.propsRef.website;
          break;
      }
    }

    return patch;
  }

  validate(): void {
    const props = this.getProps();

    if (!(props.companyName instanceof CompanyName)) {
      throw new ValidationError('Employer company name must be a CompanyName value object');
    }

    if (props.taxCode !== null && !(props.taxCode instanceof TaxCode)) {
      throw new ValidationError('Employer tax code must be a TaxCode value object');
    }

    if (!props.identityId.trim()) {
      throw new ValidationError('Employer identity id is required');
    }

    if (props.foundedYear !== null) {
      if (props.foundedYear < 1800 || props.foundedYear > 2100) {
        throw new ValidationError('Employer founded year must be between 1800 and 2100');
      }
    }
  }
}
