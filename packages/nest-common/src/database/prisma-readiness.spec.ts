import assert from 'node:assert/strict';
import test from 'node:test';
import { InfrastructureError } from '../errors/infrastructure-error';
import { createDatabaseReadinessCheck } from './prisma/prisma-readiness';

test('creates a readiness check from a pingable service', async () => {
    let called = false;
    const readinessCheck = createDatabaseReadinessCheck(
        {
            async ping(): Promise<{ database: 'up' }> {
                called = true;
                return { database: 'up' };
            }
        },
        'prisma'
    );

    const result = await readinessCheck.check();

    assert.equal(readinessCheck.name, 'prisma');
    assert.equal(called, true);
    assert.deepEqual(result, { database: 'up' });
});

test('fails when client does not support readiness checks', async () => {
    const readinessCheck = createDatabaseReadinessCheck(
        {
            async $connect(): Promise<void> {},
            async $disconnect(): Promise<void> {}
        },
        'prisma'
    );

    await assert.rejects(
        async () => readinessCheck.check(),
        (error: unknown) =>
            error instanceof InfrastructureError &&
            error.code === 'DATABASE_READINESS_UNSUPPORTED'
    );
});
