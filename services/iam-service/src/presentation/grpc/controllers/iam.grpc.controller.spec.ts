import assert from 'node:assert/strict';
import test from 'node:test';
import { Metadata } from '@grpc/grpc-js';
import {
  IdentityAlreadyExistsError,
  IdentityNotFoundError,
  InvalidTokenError
} from '../../../application';
import { IamGrpcController } from './iam.grpc.controller';

function createController(overrides?: Partial<{
  activateIdentityCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  getCurrentIdentityQueryHandler: { execute: (input: unknown) => Promise<unknown> };
  loginIdentityCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  logoutSessionCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  requestPasswordResetCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  refreshSessionCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  registerIdentityCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  resetPasswordCommandHandler: { execute: (input: unknown) => Promise<unknown> };
  validateAccessTokenQueryHandler: { execute: (input: unknown) => Promise<unknown> };
}>): IamGrpcController {
  return new IamGrpcController(
    (overrides?.registerIdentityCommandHandler ??
      ({
        async execute() {
          return {
            createdAt: '2026-06-05T00:00:00.000Z',
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            role: 'candidate',
            status: 'pending_profile'
          };
        }
      } as never)) as never,
    (overrides?.loginIdentityCommandHandler ??
      ({
        async execute() {
          return {
            accessToken: 'access-token-1',
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            refreshToken: 'refresh-token-1',
            role: 'candidate'
          };
        }
      } as never)) as never,
    (overrides?.refreshSessionCommandHandler ??
      ({
        async execute() {
          return {
            accessToken: 'access-token-2',
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            refreshToken: 'refresh-token-2',
            role: 'candidate'
          };
        }
      } as never)) as never,
    (overrides?.logoutSessionCommandHandler ??
      ({
        async execute() {
          return { loggedOut: true };
        }
      } as never)) as never,
    (overrides?.requestPasswordResetCommandHandler ??
      ({
        async execute() {
          return { accepted: true };
        }
      } as never)) as never,
    (overrides?.resetPasswordCommandHandler ??
      ({
        async execute() {
          return { passwordReset: true };
        }
      } as never)) as never,
    (overrides?.validateAccessTokenQueryHandler ??
      ({
        async execute() {
          return {
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            role: 'candidate'
          };
        }
      } as never)) as never,
    (overrides?.getCurrentIdentityQueryHandler ??
      ({
        async execute() {
          return {
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            role: 'candidate',
            status: 'active'
          };
        }
      } as never)) as never,
    (overrides?.activateIdentityCommandHandler ??
      ({
        async execute() {
          return {
            email: 'user@example.com',
            identityId: 'identity-grpc-1',
            role: 'candidate',
            status: 'active'
          };
        }
      } as never)) as never
  );
}

test('maps register request fields and resolves request id from metadata', async () => {
  let capturedInput: unknown;
  const controller = createController({
    registerIdentityCommandHandler: {
      async execute(input: unknown) {
        capturedInput = input;
        return {
          createdAt: '2026-06-05T00:00:00.000Z',
          email: 'user@example.com',
          identityId: 'identity-grpc-1',
          role: 'candidate',
          status: 'pending_profile'
        };
      }
    }
  });
  const metadata = new Metadata();
  metadata.set('x-request-id', 'req-grpc-1');

  const result = await controller.registerIdentity(
    {
      accepted_terms: true,
      email: 'user@example.com',
      password: '12345678',
      role: 'candidate'
    },
    metadata
  );

  assert.deepEqual(capturedInput, {
    acceptedTerms: true,
    email: 'user@example.com',
    password: '12345678',
    requestId: 'req-grpc-1',
    role: 'candidate'
  });
  assert.deepEqual(result, {
    created_at: '2026-06-05T00:00:00.000Z',
    email: 'user@example.com',
    identity_id: 'identity-grpc-1',
    role: 'candidate',
    status: 'pending_profile'
  });
});

test('maps login request and response fields', async () => {
  let capturedInput: unknown;
  const controller = createController({
    loginIdentityCommandHandler: {
      async execute(input: unknown) {
        capturedInput = input;
        return {
          accessToken: 'access-token-1',
          email: 'user@example.com',
          identityId: 'identity-grpc-1',
          refreshToken: 'refresh-token-1',
          role: 'candidate'
        };
      }
    }
  });

  const result = await controller.loginIdentity({
    email: 'user@example.com',
    password: '12345678',
    remember_me: true
  });

  assert.deepEqual(capturedInput, {
    email: 'user@example.com',
    password: '12345678',
    rememberMe: true
  });
  assert.deepEqual(result, {
    access_token: 'access-token-1',
    email: 'user@example.com',
    identity_id: 'identity-grpc-1',
    refresh_token: 'refresh-token-1',
    role: 'candidate'
  });
});

test('maps activate-identity response shape', async () => {
  const controller = createController();

  const result = await controller.activateIdentity({
    identity_id: 'identity-grpc-1'
  });

  assert.deepEqual(result, {
    identity_id: 'identity-grpc-1',
    status: 'active'
  });
});

test('maps validate-access-token response shape', async () => {
  const controller = createController();

  const result = await controller.validateAccessToken({
    access_token: 'access-token-1'
  });

  assert.deepEqual(result, {
    email: 'user@example.com',
    role: 'candidate',
    user_id: 'identity-grpc-1',
    valid: true
  });
});

test('maps get-current-identity response shape', async () => {
  const controller = createController();

  const result = await controller.getCurrentIdentity({
    identity_id: 'identity-grpc-1'
  });

  assert.deepEqual(result, {
    email: 'user@example.com',
    identity_id: 'identity-grpc-1',
    role: 'candidate',
    status: 'active'
  });
});

test('maps request-password-reset response shape', async () => {
  let capturedInput: unknown;
  const controller = createController({
    requestPasswordResetCommandHandler: {
      async execute(input: unknown) {
        capturedInput = input;
        return { accepted: true };
      }
    }
  });
  const metadata = new Metadata();
  metadata.set('x-request-id', 'req-grpc-reset-1');

  const result = await controller.requestPasswordReset(
    {
      email: 'user@example.com'
    },
    metadata
  );

  assert.deepEqual(capturedInput, {
    email: 'user@example.com',
    requestId: 'req-grpc-reset-1'
  });
  assert.deepEqual(result, {
    accepted: true
  });
});

test('maps reset-password response shape', async () => {
  let capturedInput: unknown;
  const controller = createController({
    resetPasswordCommandHandler: {
      async execute(input: unknown) {
        capturedInput = input;
        return { passwordReset: true };
      }
    }
  });

  const result = await controller.resetPassword({
    new_password: 'new-password-1',
    token: 'reset-token-raw'
  });

  assert.deepEqual(capturedInput, {
    newPassword: 'new-password-1',
    requestId: undefined,
    token: 'reset-token-raw'
  });
  assert.deepEqual(result, {
    password_reset: true
  });
});

test('converts application errors into RpcException payloads', async () => {
  const controller = createController({
    validateAccessTokenQueryHandler: {
      async execute() {
        throw new InvalidTokenError();
      }
    }
  });

  await assert.rejects(
    () =>
      controller.validateAccessToken({
        access_token: 'bad-token'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
        message?: string;
      };

      return (
        payload.code === 'UNAUTHORIZED' &&
        payload.message === 'Invalid access token'
      );
    }
  );
});

test('converts conflict application errors into ALREADY_EXISTS gRPC payloads', async () => {
  const controller = createController({
    registerIdentityCommandHandler: {
      async execute() {
        throw new IdentityAlreadyExistsError('user@example.com');
      }
    }
  });

  await assert.rejects(
    () =>
      controller.registerIdentity({
        accepted_terms: true,
        email: 'user@example.com',
        password: '12345678',
        role: 'candidate'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
        message?: string;
      };

      return (
        payload.code === 'CONFLICT' &&
        payload.message === 'Identity already exists for email: user@example.com'
      );
    }
  );
});

test('converts not-found application errors into NOT_FOUND gRPC payloads', async () => {
  const controller = createController({
    getCurrentIdentityQueryHandler: {
      async execute() {
        throw new IdentityNotFoundError('missing-identity');
      }
    }
  });

  await assert.rejects(
    () =>
      controller.getCurrentIdentity({
        identity_id: 'missing-identity'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
        message?: string;
      };

      return (
        payload.code === 'NOT_FOUND' &&
        payload.message === 'Identity not found: missing-identity'
      );
    }
  );
});
