import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { GatewayResumeExportService } from './gateway-resume-export.service';

function createService(secret = 'test-secret') {
  return new GatewayResumeExportService(
    {
      async getExportPayload() {
        throw new Error('unused');
      },
      async getResumeDetail() {
        throw new Error('unused');
      }
    } as never,
    {
      get(key: string) {
        if (key === 'JWT_SECRET') {
          return secret;
        }

        return undefined;
      },
      getOrThrow(key: string) {
        if (key === 'JWT_SECRET') {
          return secret;
        }

        throw new Error(`missing ${key}`);
      }
    } as never
  );
}

test('sign and verify export token roundtrip', () => {
  const service = createService();
  const token = service.signExportToken({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  });

  const payload = service.verifyExportToken(token);

  assert.equal(payload.identityId, 'identity-1');
  assert.equal(payload.resumeId, 'resume-1');
  assert.ok(payload.exp > Date.now());
});

test('verify export token rejects tampered token', () => {
  const service = createService();
  const token = `${service.signExportToken({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  })}tampered`;

  assert.throws(() => service.verifyExportToken(token), UnauthorizedException);
});

test('verify export token rejects expired token', () => {
  const service = createService();
  const [encodedPayload, signature] = service
    .signExportToken({
      identityId: 'identity-1',
      resumeId: 'resume-1'
    })
    .split('.');
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
    exp: number;
    identityId: string;
    resumeId: string;
  };
  payload.exp = Date.now() - 1_000;
  const expiredToken = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;

  assert.throws(() => service.verifyExportToken(expiredToken), UnauthorizedException);
});