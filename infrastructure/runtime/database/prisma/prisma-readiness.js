"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseReadinessCheck = createDatabaseReadinessCheck;
const infrastructure_error_1 = require("../../../errors/infrastructure-error");
function isPingable(clientOrService) {
    return typeof clientOrService.ping === 'function';
}
function isQueryable(clientOrService) {
    return (typeof clientOrService.$queryRawUnsafe ===
        'function' ||
        typeof clientOrService.$executeRawUnsafe ===
            'function');
}
async function pingDatabase(clientOrService) {
    if (isPingable(clientOrService)) {
        return clientOrService.ping();
    }
    if (isQueryable(clientOrService)) {
        if (typeof clientOrService.$queryRawUnsafe === 'function') {
            await clientOrService.$queryRawUnsafe('SELECT 1');
            return { database: 'up' };
        }
        if (typeof clientOrService.$executeRawUnsafe === 'function') {
            await clientOrService.$executeRawUnsafe('SELECT 1');
            return { database: 'up' };
        }
    }
    throw new infrastructure_error_1.InfrastructureError('Database readiness check is unsupported', {
        code: 'DATABASE_READINESS_UNSUPPORTED'
    });
}
function createDatabaseReadinessCheck(clientOrService, name = 'database') {
    return {
        check: () => pingDatabase(clientOrService),
        name
    };
}
