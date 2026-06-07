import type {
    OnApplicationShutdown,
    OnModuleInit
} from '@nestjs/common';
import { InfrastructureError } from '../../../errors/infrastructure-error';
import type { PrismaClientLike } from '../database.types';

export class PrismaLifecycleService<TClient extends PrismaClientLike>
    implements OnApplicationShutdown, OnModuleInit
{
    constructor(protected readonly client: TClient) {}

    get prisma(): TClient {
        return this.client;
    }

    async onModuleInit(): Promise<void> {
        await this.client.$connect();
    }

    async onApplicationShutdown(): Promise<void> {
        await this.client.$disconnect();
    }

    async ping(): Promise<{ database: 'up' }> {
        if (typeof this.client.$queryRawUnsafe === 'function') {
            await this.client.$queryRawUnsafe('SELECT 1');
            return { database: 'up' };
        }

        if (typeof this.client.$executeRawUnsafe === 'function') {
            await this.client.$executeRawUnsafe('SELECT 1');
            return { database: 'up' };
        }

        throw new InfrastructureError(
            'Prisma client does not support readiness ping',
            {
                code: 'DATABASE_READINESS_UNSUPPORTED'
            }
        );
    }
}
