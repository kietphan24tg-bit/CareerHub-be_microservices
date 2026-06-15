import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { PrismaClientLike } from '../database.types';
export declare class PrismaLifecycleService<TClient extends PrismaClientLike> implements OnApplicationShutdown, OnModuleInit {
    protected readonly client: TClient;
    constructor(client: TClient);
    get prisma(): TClient;
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
    ping(): Promise<{
        database: 'up';
    }>;
}
