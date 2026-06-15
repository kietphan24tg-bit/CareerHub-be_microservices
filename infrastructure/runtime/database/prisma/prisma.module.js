"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaRuntimeModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaRuntimeModule = void 0;
exports.createPrismaModule = createPrismaModule;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_constants_1 = require("../database.constants");
const database_runtime_config_1 = require("../database-runtime-config");
const prisma_readiness_1 = require("./prisma-readiness");
let PrismaRuntimeModule = PrismaRuntimeModule_1 = class PrismaRuntimeModule {
    static register(options) {
        const runtimeConfigToken = options.runtimeConfigToken ?? database_constants_1.DEFAULT_DATABASE_RUNTIME_CONFIG;
        const runtimeConfigProvider = {
            provide: runtimeConfigToken,
            inject: [config_1.ConfigService],
            useFactory: (configService) => (0, database_runtime_config_1.getDatabaseRuntimeConfig)(configService)
        };
        const clientProvider = {
            provide: options.clientToken,
            inject: [runtimeConfigToken],
            useFactory: (config) => options.createClient(config)
        };
        const serviceProvider = {
            provide: options.serviceToken,
            inject: [options.clientToken],
            useFactory: (client) => options.createService(client)
        };
        const readinessProvider = {
            provide: options.readinessCheckToken,
            inject: [options.serviceToken],
            useFactory: (service) => (0, prisma_readiness_1.createDatabaseReadinessCheck)(service, options.readinessCheckName)
        };
        return {
            exports: [
                runtimeConfigToken,
                options.clientToken,
                options.serviceToken,
                options.readinessCheckToken,
                ...(options.exports ?? [])
            ],
            module: PrismaRuntimeModule_1,
            providers: [
                runtimeConfigProvider,
                clientProvider,
                serviceProvider,
                readinessProvider
            ]
        };
    }
};
exports.PrismaRuntimeModule = PrismaRuntimeModule;
exports.PrismaRuntimeModule = PrismaRuntimeModule = PrismaRuntimeModule_1 = __decorate([
    (0, common_1.Module)({})
], PrismaRuntimeModule);
function createPrismaModule(options) {
    return PrismaRuntimeModule.register(options);
}
