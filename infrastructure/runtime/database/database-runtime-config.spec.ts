import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createDatabaseRuntimeConfig,
    getDatabaseRuntimeConfig
} from './database-runtime-config';
import { InfrastructureError } from '../../errors/infrastructure-error';

test('creates database runtime config from env', () => {
    const config = createDatabaseRuntimeConfig({
        DATABASE_URL: 'postgresql://careerhub:test@localhost:5432/careerhub'
    });

    assert.equal(
        config.databaseUrl,
        'postgresql://careerhub:test@localhost:5432/careerhub'
    );
});

test('fails when DATABASE_URL is missing', () => {
    assert.throws(
        () => createDatabaseRuntimeConfig({}),
        (error: unknown) =>
            error instanceof InfrastructureError &&
            error.code === 'INVALID_DATABASE_CONFIGURATION'
    );
});

test('reads database runtime config from config service', () => {
    const config = getDatabaseRuntimeConfig({
        get: (key: string) =>
            key === 'DATABASE_URL'
                ? 'postgresql://careerhub:test@localhost:5432/careerhub'
                : undefined,
        getOrThrow: () => {
            throw new Error('Not used in this test');
        }
    });

    assert.equal(
        config.databaseUrl,
        'postgresql://careerhub:test@localhost:5432/careerhub'
    );
});
