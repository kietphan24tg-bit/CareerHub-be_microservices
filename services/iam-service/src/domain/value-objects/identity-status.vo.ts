import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

export const IDENTITY_STATUSES = ['active', 'disabled'] as const;
export type IdentityStatusValue = (typeof IDENTITY_STATUSES)[number];

export class IdentityStatus extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: value.trim().toLowerCase()
    });
  }

  static active(): IdentityStatus {
    return new IdentityStatus('active');
  }

  static disabled(): IdentityStatus {
    return new IdentityStatus('disabled');
  }

  get value(): IdentityStatusValue {
    return this.raw() as IdentityStatusValue;
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isDisabled(): boolean {
    return this.value === 'disabled';
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Identity status is required');
    }

    if (!IDENTITY_STATUSES.includes(props.value as IdentityStatusValue)) {
      throw new ValidationError('Identity status is invalid');
    }
  }
}
