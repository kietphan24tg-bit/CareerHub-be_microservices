import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpStatus } from '@nestjs/common';
import { mapRpcErrorToHttpException } from './rpc-to-http-error.mapper';

test('maps grpc already exists error to conflict with clean message', () => {
  const exception = mapRpcErrorToHttpException({
    code: 6,
    message: '6 ALREADY_EXISTS: Identity already exists for email: user@example.com'
  });

  assert.equal(exception.getStatus(), HttpStatus.CONFLICT);
  assert.deepEqual(exception.getResponse(), {
    code: 'ALREADY_EXISTS',
    details: undefined,
    message: 'Identity already exists for email: user@example.com'
  });
});

test('maps grpc invalid argument error to bad request with clean message', () => {
  const exception = mapRpcErrorToHttpException({
    code: 3,
    message: '3 INVALID_ARGUMENT: Identity accepted terms must be true'
  });

  assert.equal(exception.getStatus(), HttpStatus.BAD_REQUEST);
  assert.deepEqual(exception.getResponse(), {
    code: 'INVALID_ARGUMENT',
    details: undefined,
    message: 'Identity accepted terms must be true'
  });
});

test('maps gateway timeout code to gateway timeout response', () => {
  const exception = mapRpcErrorToHttpException({
    code: 'GATEWAY_TIMEOUT',
    message: 'Downstream identity service timed out'
  });

  assert.equal(exception.getStatus(), HttpStatus.GATEWAY_TIMEOUT);
  assert.deepEqual(exception.getResponse(), {
    code: 'GATEWAY_TIMEOUT',
    details: undefined,
    message: 'Downstream identity service timed out'
  });
});

test('maps grpc unavailable error to service unavailable with clean message', () => {
  const exception = mapRpcErrorToHttpException({
    code: 14,
    message: '14 UNAVAILABLE: No connection established. Last error: null. Resolution note: '
  });

  assert.equal(exception.getStatus(), HttpStatus.SERVICE_UNAVAILABLE);
  assert.deepEqual(exception.getResponse(), {
    code: 'UNAVAILABLE',
    details: undefined,
    message: 'No connection established. Last error: null. Resolution note: '
  });
});

test('maps grpc unknown invalid refresh token error to unauthorized', () => {
  const exception = mapRpcErrorToHttpException({
    code: 'UNKNOWN',
    details: 'Invalid refresh token',
    message: 'Invalid refresh token'
  });

  assert.equal(exception.getStatus(), HttpStatus.UNAUTHORIZED);
  assert.deepEqual(exception.getResponse(), {
    code: 'UNAUTHORIZED',
    details: 'Invalid refresh token',
    message: 'Invalid refresh token'
  });
});
