import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export class CompanyName extends ValueObject<string> {
  get value(): string {
    return this.props.value;
  }

  protected validate(props: { value: string }): void {
    const value = props.value.trim();

    if (!value) {
      throw new ValidationError('Employer company name is required');
    }

    if (value.length > 160) {
      throw new ValidationError('Employer company name must be 160 characters or fewer');
    }
  }

  static create(value: string): CompanyName {
    return new CompanyName({ value: value.trim() });
  }
}
