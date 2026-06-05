import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IamGrpcClient } from '../../infrastructure/transport/grpc/iam-grpc.client';
import { GATEWAY_IS_PUBLIC_KEY } from '../auth.constants';

function extractBearerToken(
  authorizationHeader: string | string[] | undefined
): string | undefined {
  const value = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (!value?.startsWith('Bearer ')) {
    return undefined;
  }

  const token = value.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

@Injectable()
export class GatewayJwtAuthGuard implements CanActivate {
  constructor(
    private readonly iamGrpcClient: IamGrpcClient,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      GATEWAY_IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token'
      });
    }

    const response = await this.iamGrpcClient.validateAccessToken(
      {
        access_token: token
      },
      request.id
    );

    if (!response.valid) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid bearer token'
      });
    }

    request.user = {
      email: response.email,
      id: response.user_id,
      role: response.role
    };

    return true;
  }
}
