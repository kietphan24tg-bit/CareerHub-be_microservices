import type {
  BenefitCatalogMessage,
  CreateOfferInputMessage,
  OfferDetailMessage,
  UpdateOfferInputMessage
} from '@careerhub/contracts';
import type {
  CandidateOfferDecisionRequestDto,
  CreateOfferRequestDto,
  OfferBenefitInputRequestDto,
  UpdateOfferRequestDto
} from '../../../presentation/http/offers/dto/offer-write.request.dto';

function nullableString(
  value: string | undefined,
  nullFields?: string[],
  field?: string
): string | null {
  if (field && nullFields?.includes(field)) {
    return null;
  }

  if (value === undefined || value === '') {
    return null;
  }

  return value;
}

function nullableNumber(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}

export type GatewayHttpOfferBenefit = {
  amount: string | null;
  annualLeaveDays: number | null;
  catalogDescription: string | null;
  catalogId: string | null;
  catalogLabel: string | null;
  currency: string | null;
  description: string | null;
  frequency: string | null;
  hasMonetaryValue: boolean;
  id: string;
  name: string | null;
  type: string;
};

export type GatewayHttpOfferDetail = {
  applicationId: string;
  benefits: GatewayHttpOfferBenefit[];
  bonusDetails: string | null;
  candidateUserId: string;
  companyId: string;
  contractDocumentUrl: string | null;
  createdAt: string;
  createdByUserId: string;
  currency: string | null;
  deletedAt: string | null;
  departmentTeam: string | null;
  employmentType: string | null;
  expiresAt: string | null;
  id: string;
  jobId: string;
  location: string | null;
  message: string | null;
  probationCustom: string | null;
  probationType: string | null;
  reportingTo: string | null;
  respondedAt: string | null;
  salary: string | null;
  salaryPeriod: string;
  seniorityLabel: string | null;
  sentAt: string | null;
  startDate: string | null;
  status: string;
  title: string;
  updatedAt: string;
  viewedAt: string | null;
  workModel: string | null;
};

function toGrpcOfferBenefitInput(benefit: OfferBenefitInputRequestDto) {
  return {
    amount: benefit.amount === null || benefit.amount === undefined ? undefined : String(benefit.amount),
    annual_leave_days: benefit.annualLeaveDays ?? undefined,
    catalog_id: benefit.catalogId ?? undefined,
    currency: benefit.currency ?? undefined,
    description: benefit.description ?? undefined,
    frequency: benefit.frequency ?? undefined,
    has_monetary_value: benefit.hasMonetaryValue,
    name: benefit.name ?? undefined,
    type: benefit.type
  };
}

export function toGrpcCreateOfferInput(dto: CreateOfferRequestDto): CreateOfferInputMessage {
  return {
    benefits: dto.benefits?.map(toGrpcOfferBenefitInput),
    bonus_details: dto.bonusDetails ?? undefined,
    contract_document_url: dto.contractDocumentUrl ?? undefined,
    currency: dto.currency ?? undefined,
    department_team: dto.departmentTeam ?? undefined,
    employment_type: dto.employmentType ?? undefined,
    location: dto.location ?? undefined,
    message: dto.message ?? undefined,
    offer_expires_at: dto.offerExpiresAt ?? undefined,
    probation_custom: dto.probationCustom ?? undefined,
    probation_type: dto.probationType ?? undefined,
    reporting_to: dto.reportingTo ?? undefined,
    salary: dto.salary === null || dto.salary === undefined ? undefined : String(dto.salary),
    salary_period: dto.salaryPeriod,
    seniority_label: dto.seniorityLabel ?? undefined,
    start_date: dto.startDate ?? undefined,
    title: dto.title,
    work_model: dto.workModel ?? undefined
  };
}

export function toGrpcUpdateOfferInput(dto: UpdateOfferRequestDto): UpdateOfferInputMessage {
  const input: UpdateOfferInputMessage = {};

  if (dto.title !== undefined) input.title = dto.title;
  if (dto.seniorityLabel !== undefined) input.seniority_label = dto.seniorityLabel ?? '';
  if (dto.departmentTeam !== undefined) input.department_team = dto.departmentTeam ?? '';
  if (dto.reportingTo !== undefined) input.reporting_to = dto.reportingTo ?? '';
  if (dto.message !== undefined) input.message = dto.message ?? '';
  if (dto.bonusDetails !== undefined) input.bonus_details = dto.bonusDetails ?? '';
  if (dto.contractDocumentUrl !== undefined) {
    input.contract_document_url = dto.contractDocumentUrl ?? '';
  }
  if (dto.salary !== undefined) {
    input.salary = dto.salary === null ? '' : String(dto.salary);
  }
  if (dto.salaryPeriod !== undefined) input.salary_period = dto.salaryPeriod;
  if (dto.currency !== undefined) input.currency = dto.currency ?? '';
  if (dto.employmentType !== undefined) input.employment_type = dto.employmentType ?? '';
  if (dto.workModel !== undefined) input.work_model = dto.workModel ?? '';
  if (dto.startDate !== undefined) input.start_date = dto.startDate ?? '';
  if (dto.location !== undefined) input.location = dto.location ?? '';
  if (dto.offerExpiresAt !== undefined) input.offer_expires_at = dto.offerExpiresAt ?? '';
  if (dto.probationType !== undefined) input.probation_type = dto.probationType ?? '';
  if (dto.probationCustom !== undefined) input.probation_custom = dto.probationCustom ?? '';
  if (dto.benefits !== undefined) input.benefits = dto.benefits.map(toGrpcOfferBenefitInput);

  return input;
}

export function toGatewayHttpOfferDetail(
  offer: OfferDetailMessage,
  catalogById?: Map<string, BenefitCatalogMessage>
): GatewayHttpOfferDetail {
  const nullFields = offer.null_fields ?? [];

  return {
    applicationId: offer.application_id,
    benefits: (offer.benefits ?? []).map((benefit) => {
      const catalog = benefit.catalog_id ? catalogById?.get(benefit.catalog_id) : undefined;

      return {
        amount: nullableString(benefit.amount, benefit.null_fields, 'amount'),
        annualLeaveDays: nullableNumber(benefit.annual_leave_days),
        catalogDescription: catalog ? nullableString(catalog.description, catalog.null_fields, 'description') : null,
        catalogId: nullableString(benefit.catalog_id, benefit.null_fields, 'catalog_id'),
        catalogLabel: catalog?.label ?? null,
        currency: nullableString(benefit.currency, benefit.null_fields, 'currency'),
        description: nullableString(benefit.description, benefit.null_fields, 'description'),
        frequency: nullableString(benefit.frequency, benefit.null_fields, 'frequency'),
        hasMonetaryValue: benefit.has_monetary_value,
        id: benefit.id,
        name: nullableString(benefit.name, benefit.null_fields, 'name'),
        type: benefit.type
      };
    }),
    bonusDetails: nullableString(offer.bonus_details, nullFields, 'bonus_details'),
    candidateUserId: offer.candidate_identity_id,
    companyId: offer.employer_identity_id,
    contractDocumentUrl: nullableString(offer.contract_document_url, nullFields, 'contract_document_url'),
    createdAt: offer.created_at,
    createdByUserId: offer.created_by_identity_id,
    currency: nullableString(offer.currency, nullFields, 'currency'),
    deletedAt: nullableString(offer.deleted_at, nullFields, 'deleted_at'),
    departmentTeam: nullableString(offer.department_team, nullFields, 'department_team'),
    employmentType: nullableString(offer.employment_type, nullFields, 'employment_type'),
    expiresAt: nullableString(offer.expires_at, nullFields, 'expires_at'),
    id: offer.id,
    jobId: offer.job_id,
    location: nullableString(offer.location, nullFields, 'location'),
    message: nullableString(offer.message, nullFields, 'message'),
    probationCustom: nullableString(offer.probation_custom, nullFields, 'probation_custom'),
    probationType: nullableString(offer.probation_type, nullFields, 'probation_type'),
    reportingTo: nullableString(offer.reporting_to, nullFields, 'reporting_to'),
    respondedAt: nullableString(offer.responded_at, nullFields, 'responded_at'),
    salary: nullableString(offer.salary, nullFields, 'salary'),
    salaryPeriod: offer.salary_period || 'monthly',
    seniorityLabel: nullableString(offer.seniority_label, nullFields, 'seniority_label'),
    sentAt: nullableString(offer.sent_at, nullFields, 'sent_at'),
    startDate: nullableString(offer.start_date, nullFields, 'start_date'),
    status: offer.status,
    title: offer.title,
    updatedAt: offer.updated_at,
    viewedAt: nullableString(offer.viewed_at, nullFields, 'viewed_at'),
    workModel: nullableString(offer.work_model, nullFields, 'work_model')
  };
}

export function toGrpcCandidateOfferDecisionInput(dto: CandidateOfferDecisionRequestDto) {
  return {
    note: dto.note ?? undefined
  };
}

export function toGatewayHttpBenefitCatalogItem(catalog: BenefitCatalogMessage) {
  return {
    code: catalog.code,
    description: nullableString(catalog.description, catalog.null_fields, 'description'),
    hasMonetaryValueDefault: catalog.has_monetary_value_default,
    id: catalog.id,
    isSelectable: catalog.is_selectable,
    label: catalog.label,
    requiresAmount: catalog.requires_amount,
    requiresAnnualLeaveDays: catalog.requires_annual_leave_days,
    requiresFrequency: catalog.requires_frequency,
    sortOrder: catalog.sort_order
  };
}
