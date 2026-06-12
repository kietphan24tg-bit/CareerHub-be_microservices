import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export class ResumeOwner extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: typeof value === 'string' ? value.trim() : value
    });
  }

  get value(): string {
    return this.raw() as string;
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Resume owner identity id is required');
    }
  }
}
