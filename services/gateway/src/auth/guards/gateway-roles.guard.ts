import {
  CanActivate,
  ExecutionContext,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  GATEWAY_IS_PUBLIC_KEY,
  GATEWAY_ROLES_KEY
} from '../auth.constants';
import type { GatewayAuthenticatedUser } from '../types/gateway-auth.types';

@Injectable()
export class GatewayRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      GATEWAY_IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      GATEWAY_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: GatewayAuthenticatedUser;
    }>();

    return request.user
      ? requiredRoles.includes(request.user.role)
      : false;
  }
}
