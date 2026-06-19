import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

const TAX_CODE_PATTERN = /^[A-Za-z0-9-]+$/;

export class TaxCode extends ValueObject<string> {
  get value(): string {
    return this.props.value;
  }

  protected validate(props: { value: string }): void {
    const value = props.value.trim();

    if (!value) {
      throw new ValidationError('Employer tax code cannot be blank');
    }

    if (value.length > 32) {
      throw new ValidationError('Employer tax code must be 32 characters or fewer');
    }

    if (!TAX_CODE_PATTERN.test(value)) {
      throw new ValidationError('Employer tax code contains invalid characters');
    }
  }

  static create(value: string): TaxCode {
    return new TaxCode({ value: value.trim() });
  }
}
