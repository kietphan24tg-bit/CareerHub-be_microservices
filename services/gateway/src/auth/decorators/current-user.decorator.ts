import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { GatewayAuthenticatedUser } from '../types/gateway-auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): GatewayAuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest();
    return request.user as GatewayAuthenticatedUser | undefined;
  }
);
