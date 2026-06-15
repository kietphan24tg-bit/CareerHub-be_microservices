"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeHealthRegistry = void 0;
const infrastructure_error_1 = require("../../errors/infrastructure-error");
class RuntimeHealthRegistry {
    serviceName;
    readinessChecks = [];
    bootstrapReady = false;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    markReady() {
        this.bootstrapReady = true;
    }
    markNotReady() {
        this.bootstrapReady = false;
    }
    registerReadinessCheck(check) {
        this.readinessChecks.push(check);
    }
    getLivenessStatus() {
        return {
            checks: [
                {
                    message: 'Process is alive',
                    name: 'process',
                    status: 'up'
                }
            ],
            service: this.serviceName,
            status: 'up',
            timestamp: new Date().toISOString()
        };
    }
    async getReadinessStatus() {
        const checks = [
            {
                message: this.bootstrapReady
                    ? 'Bootstrap completed'
                    : 'Bootstrap not completed',
                name: 'bootstrap',
                status: this.bootstrapReady ? 'up' : 'down'
            }
        ];
        for (const readinessCheck of this.readinessChecks) {
            try {
                const details = await readinessCheck.check();
                checks.push({
                    details,
                    name: readinessCheck.name,
                    status: 'up'
                });
            }
            catch (error) {
                checks.push({
                    details: error instanceof Error ? error.message : error,
                    name: readinessCheck.name,
                    status: 'down'
                });
            }
        }
        const status = checks.every((check) => check.status === 'up') ? 'up' : 'down';
        return {
            checks,
            service: this.serviceName,
            status,
            timestamp: new Date().toISOString()
        };
    }
    async getHealthStatus() {
        return this.getReadinessStatus();
    }
    assertReady() {
        if (!this.bootstrapReady) {
            throw new infrastructure_error_1.InfrastructureError('Service bootstrap has not completed', {
                code: 'SERVICE_NOT_READY'
            });
        }
    }
}
exports.RuntimeHealthRegistry = RuntimeHealthRegistry;
