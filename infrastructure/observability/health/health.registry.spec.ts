import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeHealthRegistry } from './health.registry';

test('reports liveness as up', () => {
    const registry = new RuntimeHealthRegistry('test-service');
    const result = registry.getLivenessStatus();

    assert.equal(result.service, 'test-service');
    assert.equal(result.status, 'up');
    assert.equal(result.checks[0]?.name, 'process');
});

test('reports readiness as up after bootstrap ready', async () => {
    const registry = new RuntimeHealthRegistry('test-service');
    registry.markReady();

    const result = await registry.getReadinessStatus();

    assert.equal(result.status, 'up');
    assert.equal(result.checks[0]?.name, 'bootstrap');
    assert.equal(result.checks[0]?.status, 'up');
});

test('reports readiness as down when a readiness check fails', async () => {
    const registry = new RuntimeHealthRegistry('test-service');
    registry.markReady();
    registry.registerReadinessCheck({
        async check() {
            throw new Error('database unavailable');
        },
        name: 'database'
    });

    const result = await registry.getReadinessStatus();
    const failingCheck = result.checks.find((check) => check.name === 'database');

    assert.equal(result.status, 'down');
    assert.equal(failingCheck?.status, 'down');
    assert.equal(failingCheck?.details, 'database unavailable');
});
