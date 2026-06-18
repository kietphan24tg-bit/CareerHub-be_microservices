import { ValidationError } from '@careerhub/shared-kernel';
import type { BenefitCatalogRecord } from '../ports/recruitment-repository.port';
import { normalizeNullableString } from './interview-schedule.utils';

export const OFFER_BENEFIT_TYPE = {
  annualLeave: 'annual_leave',
  custom: 'custom'
} as const;

export const PROBATION_TYPE = {
  custom: 'custom'
} as const;

export const OFFER_STATUS = {
  accepted: 'accepted',
  draft: 'draft',
  expired: 'expired',
  rejected: 'rejected',
  sent: 'sent',
  viewed: 'viewed'
} as const;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type OfferPayloadInput = {
  bonusDetails?: string | null;
  contractDocumentUrl?: string | null;
  currency?: string | null;
  departmentTeam?: string | null;
  employmentType?: string | null;
  location?: string | null;
  message?: string | null;
  offerExpiresAt?: string | null;
  probationCustom?: string | null;
  probationType?: string | null;
  reportingTo?: string | null;
  salary?: string | number | null;
  salaryPeriod?: string | null;
  seniorityLabel?: string | null;
  startDate?: string | null;
  title?: string | null;
  workModel?: string | null;
};

export type OfferBenefitInput = {
  amount?: string | number | null;
  annualLeaveDays?: number | null;
  catalogId?: string | null;
  currency?: string | null;
  description?: string | null;
  frequency?: string | null;
  hasMonetaryValue?: boolean | null;
  name?: string | null;
  type: string;
};

export function assertDateOnlyInput(value: string, message: string): void {
  const normalized = value.trim();
  if (!DATE_ONLY_PATTERN.test(normalized)) {
    throw new ValidationError(message);
  }
}

export function toDateOnlyOrThrow(value: string): string {
  const normalized = value.trim();
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ValidationError('Date is invalid.');
  }

  return normalized;
}

export function toDateEndOfDay(value: string): Date {
  const normalized = value.trim();
  const parsed = new Date(`${normalized}T23:59:59.999Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ValidationError('Date is invalid.');
  }

  return parsed;
}

export function validateOfferPayload(input: OfferPayloadInput, requireTitle: boolean): void {
  if (requireTitle || input.title !== undefined) {
    const normalizedTitle = normalizeNullableString(input.title);
    if (!normalizedTitle) {
      throw new ValidationError('Offer title is required.');
    }
  }

  if (input.salary !== undefined && input.salary !== null) {
    const salaryNumber = Number(input.salary);
    if (Number.isNaN(salaryNumber) || salaryNumber < 0) {
      throw new ValidationError('Salary must be zero or greater.');
    }
  }

  if (input.startDate !== undefined && input.startDate !== null) {
    assertDateOnlyInput(input.startDate, 'Start date is invalid.');
  }

  if (input.offerExpiresAt !== undefined && input.offerExpiresAt !== null) {
    assertDateOnlyInput(input.offerExpiresAt, 'Offer expiration date is invalid.');
  }

  const normalizedProbationCustom = normalizeNullableString(input.probationCustom);
  if (input.probationType === PROBATION_TYPE.custom && !normalizedProbationCustom) {
    throw new ValidationError('Custom probation requires a probation description.');
  }

  if (
    normalizedProbationCustom &&
    input.probationType !== undefined &&
    input.probationType !== null &&
    input.probationType !== PROBATION_TYPE.custom
  ) {
    throw new ValidationError('Probation description is allowed only for custom probation.');
  }
}

export function validateBenefitInputs(
  items: OfferBenefitInput[] | undefined,
  benefitCatalogMap: Map<string, BenefitCatalogRecord>
): void {
  if (!items?.length) {
    return;
  }

  for (const benefit of items) {
    const normalizedName = normalizeNullableString(benefit.name ?? null);
    const normalizedCurrency = normalizeNullableString(benefit.currency);
    const normalizedCatalogId = normalizeNullableString(benefit.catalogId);
    const catalogRow =
      benefit.type === OFFER_BENEFIT_TYPE.custom ? null : benefitCatalogMap.get(benefit.type);

    if (benefit.type === OFFER_BENEFIT_TYPE.custom && normalizedCatalogId) {
      throw new ValidationError('Custom benefits cannot reference a benefit catalog item.');
    }

    if (benefit.type === OFFER_BENEFIT_TYPE.custom && !normalizedName) {
      throw new ValidationError('Custom benefits require a name.');
    }

    if (benefit.type !== OFFER_BENEFIT_TYPE.custom && !catalogRow) {
      throw new ValidationError('Selected benefit does not exist in the catalog.');
    }

    if (catalogRow && normalizedCatalogId && normalizedCatalogId !== catalogRow.id) {
      throw new ValidationError('Selected benefit does not match the submitted catalog item.');
    }

    if (catalogRow && !catalogRow.isSelectable) {
      throw new ValidationError('This benefit is not selectable in the offer editor.');
    }

    const hasMonetaryValue =
      benefit.hasMonetaryValue === true || catalogRow?.hasMonetaryValueDefault === true;

    if (hasMonetaryValue || catalogRow?.requiresAmount || catalogRow?.requiresFrequency) {
      const amount = benefit.amount === undefined || benefit.amount === null ? null : Number(benefit.amount);
      if (amount === null || Number.isNaN(amount) || amount < 0) {
        throw new ValidationError('Monetary benefits require a non-negative amount.');
      }

      if (!normalizedCurrency) {
        throw new ValidationError('Monetary benefits require a currency.');
      }
    }

    if (
      (catalogRow?.requiresAnnualLeaveDays || benefit.type === OFFER_BENEFIT_TYPE.annualLeave) &&
      (benefit.annualLeaveDays === undefined || benefit.annualLeaveDays === null)
    ) {
      throw new ValidationError('Annual leave benefits require annual leave days.');
    }
  }
}

export function buildOfferBenefitCreateRows(
  offerId: string,
  items: OfferBenefitInput[],
  benefitCatalogMap: Map<string, BenefitCatalogRecord>,
  createId: () => string
) {
  return items.map((benefit) => {
    const catalogRow =
      benefit.type === OFFER_BENEFIT_TYPE.custom ? null : benefitCatalogMap.get(benefit.type);

    return {
      amount:
        benefit.amount === undefined || benefit.amount === null ? null : String(benefit.amount),
      annualLeaveDays: benefit.annualLeaveDays ?? null,
      catalogId: normalizeNullableString(benefit.catalogId) ?? catalogRow?.id ?? null,
      currency: normalizeNullableString(benefit.currency),
      description:
        benefit.type === OFFER_BENEFIT_TYPE.custom
          ? normalizeNullableString(benefit.description)
          : normalizeNullableString(benefit.description) ?? catalogRow?.description ?? null,
      frequency: benefit.frequency ?? null,
      hasMonetaryValue:
        benefit.hasMonetaryValue === true || catalogRow?.hasMonetaryValueDefault === true,
      id: createId(),
      metadata: null,
      name:
        benefit.type === OFFER_BENEFIT_TYPE.custom
          ? normalizeNullableString(benefit.name)
          : normalizeNullableString(benefit.name) ?? catalogRow?.label ?? null,
      offerId,
      type: benefit.type
    };
  });
}
