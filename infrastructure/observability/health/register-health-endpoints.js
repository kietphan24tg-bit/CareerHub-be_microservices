"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHealthEndpoints = registerHealthEndpoints;
function registerHealthEndpoints(app, healthRegistry, options) {
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    const healthPath = options?.healthPath ?? '/health';
    const livenessPath = options?.livenessPath ?? '/health/live';
    const readinessPath = options?.readinessPath ?? '/health/ready';
    instance.get(livenessPath, (_request, response) => {
        response.status(200).json(healthRegistry.getLivenessStatus());
    });
    instance.get(readinessPath, async (_request, response) => {
        const readiness = await healthRegistry.getReadinessStatus();
        response.status(readiness.status === 'up' ? 200 : 503).json(readiness);
    });
    instance.get(healthPath, async (_request, response) => {
        const health = await healthRegistry.getHealthStatus();
        response.status(health.status === 'up' ? 200 : 503).json(health);
    });
}
