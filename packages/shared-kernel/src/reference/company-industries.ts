export type CompanyIndustryOption = {
  value: string;
  label: string;
  allowsCustom?: boolean;
};

export const COMPANY_INDUSTRY_OTHER_VALUE = 'other';

export const COMPANY_INDUSTRY_OPTIONS: CompanyIndustryOption[] = [
  { value: 'technology', label: 'Cong nghe thong tin' },
  { value: 'hr-technology', label: 'HR Technology' },
  { value: 'finance-banking', label: 'Tai chinh - Ngan hang' },
  { value: 'marketing-communications', label: 'Marketing - Truyen thong' },
  { value: 'education-training', label: 'Giao duc - Dao tao' },
  { value: 'healthcare', label: 'Y te - Cham soc suc khoe' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'retail-consumer', label: 'Ban le - Tieu dung' },
  { value: COMPANY_INDUSTRY_OTHER_VALUE, label: 'Khac', allowsCustom: true }
];

export const COMPANY_INDUSTRY_LEGACY_ALIASES: Record<string, string> = {
  technology: 'technology',
  'cong nghe thong tin': 'technology',
  'hr technology': 'hr-technology',
  finance: 'finance-banking',
  'tai chinh / ngan hang': 'finance-banking',
  'tai chinh - ngan hang': 'finance-banking',
  marketing: 'marketing-communications',
  'marketing / truyen thong': 'marketing-communications',
  'marketing - truyen thong': 'marketing-communications',
  'giao duc / dao tao': 'education-training',
  'giao duc - dao tao': 'education-training',
  'y te / cham soc suc khoe': 'healthcare',
  'y te - cham soc suc khoe': 'healthcare',
  'e-commerce': 'e-commerce',
  retail: 'retail-consumer',
  other: COMPANY_INDUSTRY_OTHER_VALUE
};

export type CompanyIndustriesMetadata = {
  items: CompanyIndustryOption[];
  legacyAliases: Record<string, string>;
  otherValue: string;
};

export function getCompanyIndustriesMetadata(): CompanyIndustriesMetadata {
  return {
    items: COMPANY_INDUSTRY_OPTIONS,
    legacyAliases: COMPANY_INDUSTRY_LEGACY_ALIASES,
    otherValue: COMPANY_INDUSTRY_OTHER_VALUE
  };
}

export function normalizeCompanyIndustryValue(value?: string | null): string {
  const trimmedValue = value?.trim() ?? '';
  if (!trimmedValue) {
    return '';
  }

  const lowerCasedValue = trimmedValue.toLowerCase();
  return COMPANY_INDUSTRY_LEGACY_ALIASES[lowerCasedValue] ?? trimmedValue;
}

export function getCompanyIndustryLabel(value?: string | null): string {
  const normalizedValue = normalizeCompanyIndustryValue(value);
  if (!normalizedValue) {
    return '';
  }

  const option = COMPANY_INDUSTRY_OPTIONS.find((item) => item.value === normalizedValue);
  if (option && option.value !== COMPANY_INDUSTRY_OTHER_VALUE) {
    return option.label;
  }

  return normalizedValue;
}