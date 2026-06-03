import { ValidationError, ValueObject } from '@careerhub/shared-kernel';
import { InvalidRoleError } from '../errors';

export const IAM_ROLES = ['candidate', 'employer'] as const;
export type IamRole = (typeof IAM_ROLES)[number];

export class Role extends ValueObject<string> {
  constructor(value: string) {
    super({
      value: value.trim().toLowerCase()
    });
  }

  get value(): IamRole {
    return this.raw() as IamRole;
  }

  protected validate(props: { value: string }): void {
    if (!props.value) {
      throw new ValidationError('Role is required');
    }

    if (!IAM_ROLES.includes(props.value as IamRole)) {
      throw new InvalidRoleError(props.value);
    }
  }
}
