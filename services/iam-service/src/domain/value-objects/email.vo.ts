import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: value.trim().toLowerCase()
    });
  }

  get value(): string {
    return this.raw() as string;
  }

  protected validate(props: { value: string }): void {
    if (!EMAIL_REGEX.test(props.value)) {
      throw new ValidationError('Email is invalid');
    }
  }
}
