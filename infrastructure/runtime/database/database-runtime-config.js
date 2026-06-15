"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseRuntimeConfig = createDatabaseRuntimeConfig;
exports.getDatabaseRuntimeConfig = getDatabaseRuntimeConfig;
const infrastructure_error_1 = require("../../errors/infrastructure-error");
function assertDatabaseUrl(databaseUrl) {
    if (!databaseUrl?.trim()) {
        throw new infrastructure_error_1.InfrastructureError('DATABASE_URL is required', {
            code: 'INVALID_DATABASE_CONFIGURATION'
        });
    }
    return databaseUrl;
}
function createDatabaseRuntimeConfig(env = process.env) {
    return {
        databaseUrl: assertDatabaseUrl(env.DATABASE_URL)
    };
}
function getDatabaseRuntimeConfig(configService) {
    return {
        databaseUrl: assertDatabaseUrl(configService.get('DATABASE_URL'))
    };
}
