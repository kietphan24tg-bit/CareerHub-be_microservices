export type CompanyIndustryOption = {
  value: string;
  label: string;
  allowsCustom?: boolean;
};

export const COMPANY_INDUSTRY_OTHER_VALUE = 'other';

export const COMPANY_INDUSTRY_OPTIONS: CompanyIndustryOption[] = [
  { value: 'technology', label: 'Công nghệ thông tin' },
  { value: 'hr-technology', label: 'HR Technology' },
  { value: 'finance-banking', label: 'Tài chính - Ngân hàng' },
  { value: 'marketing-communications', label: 'Marketing - Truyền thông' },
  { value: 'education-training', label: 'Giáo dục - Đào tạo' },
  { value: 'healthcare', label: 'Y tế - Chăm sóc sức khỏe' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'retail-consumer', label: 'Bán lẻ - Tiêu dùng' },
  { value: COMPANY_INDUSTRY_OTHER_VALUE, label: 'Khác', allowsCustom: true }
];

export const COMPANY_INDUSTRY_LEGACY_ALIASES: Record<string, string> = {
  technology: 'technology',
  'cong nghe thong tin': 'technology',
  'công nghệ thông tin': 'technology',
  'hr technology': 'hr-technology',
  finance: 'finance-banking',
  'tai chinh / ngan hang': 'finance-banking',
  'tai chinh - ngan hang': 'finance-banking',
  'tài chính / ngân hàng': 'finance-banking',
  'tài chính - ngân hàng': 'finance-banking',
  marketing: 'marketing-communications',
  'marketing / truyen thong': 'marketing-communications',
  'marketing - truyen thong': 'marketing-communications',
  'marketing / truyền thông': 'marketing-communications',
  'marketing - truyền thông': 'marketing-communications',
  'giao duc / dao tao': 'education-training',
  'giao duc - dao tao': 'education-training',
  'giáo dục / đào tạo': 'education-training',
  'giáo dục - đào tạo': 'education-training',
  'y te / cham soc suc khoe': 'healthcare',
  'y te - cham soc suc khoe': 'healthcare',
  'y tế / chăm sóc sức khỏe': 'healthcare',
  'y tế - chăm sóc sức khỏe': 'healthcare',
  'e-commerce': 'e-commerce',
  retail: 'retail-consumer',
  'ban le / tieu dung': 'retail-consumer',
  'ban le - tieu dung': 'retail-consumer',
  'bán lẻ / tiêu dùng': 'retail-consumer',
  'bán lẻ - tiêu dùng': 'retail-consumer',
  khac: COMPANY_INDUSTRY_OTHER_VALUE,
  'khác': COMPANY_INDUSTRY_OTHER_VALUE,
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