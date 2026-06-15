"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaLifecycleService = void 0;
const infrastructure_error_1 = require("../../../errors/infrastructure-error");
class PrismaLifecycleService {
    client;
    constructor(client) {
        this.client = client;
    }
    get prisma() {
        return this.client;
    }
    async onModuleInit() {
        await this.client.$connect();
    }
    async onApplicationShutdown() {
        await this.client.$disconnect();
    }
    async ping() {
        if (typeof this.client.$queryRawUnsafe === 'function') {
            await this.client.$queryRawUnsafe('SELECT 1');
            return { database: 'up' };
        }
        if (typeof this.client.$executeRawUnsafe === 'function') {
            await this.client.$executeRawUnsafe('SELECT 1');
            return { database: 'up' };
        }
        throw new infrastructure_error_1.InfrastructureError('Prisma client does not support readiness ping', {
            code: 'DATABASE_READINESS_UNSUPPORTED'
        });
    }
}
exports.PrismaLifecycleService = PrismaLifecycleService;
