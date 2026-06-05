import { SetMetadata } from '@nestjs/common';
import { GATEWAY_ROLES_KEY } from '../auth.constants';

export const Roles = (...roles: string[]) =>
  SetMetadata(GATEWAY_ROLES_KEY, roles);
