import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment } from './env.schema';

test('validateEnvironment applies observability defaults', () => {
    const environment = validateEnvironment({
        NODE_ENV: 'development',
        SERVICE_NAME: 'test-service'
    });

    assert.equal(environment.HEALTH_ENABLED, true);
    assert.equal(environment.HEALTH_LIVENESS_PATH, '/health/live');
    assert.equal(environment.HEALTH_PATH, '/health');
    assert.equal(environment.HEALTH_READINESS_PATH, '/health/ready');
    assert.equal(environment.METRICS_ENABLED, true);
    assert.equal(environment.METRICS_PATH, '/metrics');
    assert.equal(environment.OTEL_ENABLED, true);
});

test('validateEnvironment respects observability disable flags and custom paths', () => {
    const environment = validateEnvironment({
        HEALTH_ENABLED: 'false',
        HEALTH_LIVENESS_PATH: '/livez',
        HEALTH_PATH: '/status',
        HEALTH_READINESS_PATH: '/readyz',
        METRICS_ENABLED: 'false',
        METRICS_PATH: '/internal/metrics',
        NODE_ENV: 'test',
        OTEL_ENABLED: 'false',
        SERVICE_NAME: 'test-service'
    });

    assert.equal(environment.HEALTH_ENABLED, false);
    assert.equal(environment.HEALTH_LIVENESS_PATH, '/livez');
    assert.equal(environment.HEALTH_PATH, '/status');
    assert.equal(environment.HEALTH_READINESS_PATH, '/readyz');
    assert.equal(environment.METRICS_ENABLED, false);
    assert.equal(environment.METRICS_PATH, '/internal/metrics');
    assert.equal(environment.OTEL_ENABLED, false);
});
