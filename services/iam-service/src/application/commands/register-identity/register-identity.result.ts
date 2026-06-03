import type { DomainEvent } from '@careerhub/shared-kernel';
import type { IdentityStatusValue, IamRole } from '../../../domain';

export type RegisterIdentityResult = {
  createdAt: string;
  domainEvents: DomainEvent[];
  email: string;
  identityId: string;
  role: IamRole;
  status: IdentityStatusValue;
};
