import { ValidationError, ValueObject } from '@careerhub/shared-kernel';

const ARGON2ID_HASH_REGEX =
  /^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/;

export class PasswordHash extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: value.trim()
    });
  }

  get value(): string {
    return this.raw() as string;
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Password hash is required');
    }

    if (!ARGON2ID_HASH_REGEX.test(props.value)) {
      throw new ValidationError('Password hash is invalid');
    }
  }
}
