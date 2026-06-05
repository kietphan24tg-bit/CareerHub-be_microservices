import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { GatewayJwtAuthGuard } from './gateway-jwt-auth.guard';
import { GatewayRolesGuard } from './gateway-roles.guard';

class PublicRouteFixture {
  @Public()
  static handler() {}
}

class RoleRouteFixture {
  @Roles('employer')
  static handler() {}
}

function createHttpExecutionContext(input: {
  handler: Function;
  request: Record<string, unknown>;
}): ExecutionContext {
  return {
    getArgByIndex: () => undefined,
    getArgs: () => [],
    getClass: () => PublicRouteFixture,
    getHandler: () => input.handler,
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => input.request
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined
    })
  } as unknown as ExecutionContext;
}

test('gateway jwt auth guard skips authentication for public routes', async () => {
  let validateCalled = false;
  const guard = new GatewayJwtAuthGuard(
    {
      async validateAccessToken() {
        validateCalled = true;
        return {
          email: 'user@example.com',
          role: 'candidate',
          user_id: 'identity-1',
          valid: true
        };
      }
    } as never,
    new Reflector()
  );

  const canActivate = await guard.canActivate(
    createHttpExecutionContext({
      handler: PublicRouteFixture.handler,
      request: {
        headers: {}
      }
    })
  );

  assert.equal(canActivate, true);
  assert.equal(validateCalled, false);
});

test('gateway roles guard skips authorization for public routes', () => {
  const guard = new GatewayRolesGuard(new Reflector());

  const canActivate = guard.canActivate(
    createHttpExecutionContext({
      handler: PublicRouteFixture.handler,
      request: {}
    })
  );

  assert.equal(canActivate, true);
});

test('gateway roles guard allows matching role and rejects non-matching role', () => {
  const guard = new GatewayRolesGuard(new Reflector());

  const allowed = guard.canActivate(
    createHttpExecutionContext({
      handler: RoleRouteFixture.handler,
      request: {
        user: {
          email: 'employer@example.com',
          id: 'identity-2',
          role: 'employer'
        }
      }
    })
  );

  const denied = guard.canActivate(
    createHttpExecutionContext({
      handler: RoleRouteFixture.handler,
      request: {
        user: {
          email: 'candidate@example.com',
          id: 'identity-3',
          role: 'candidate'
        }
      }
    })
  );

  assert.equal(allowed, true);
  assert.equal(denied, false);
});
