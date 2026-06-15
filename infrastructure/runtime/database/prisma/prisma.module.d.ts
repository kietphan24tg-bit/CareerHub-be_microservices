import { type DynamicModule } from '@nestjs/common';
import type { DatabaseRuntimeConfig, PrismaClientLike, PrismaReadinessTarget } from '../database.types';
type ProviderToken = string | symbol | Function;
export type CreatePrismaModuleOptions<TClient extends PrismaClientLike, TService extends PrismaReadinessTarget> = {
    clientToken: ProviderToken;
    createClient: (config: DatabaseRuntimeConfig) => TClient;
    createService: (client: TClient) => TService;
    exports?: ProviderToken[];
    readinessCheckName?: string;
    readinessCheckToken: ProviderToken;
    runtimeConfigToken?: ProviderToken;
    serviceToken: ProviderToken;
};
export declare class PrismaRuntimeModule {
    static register<TClient extends PrismaClientLike, TService extends PrismaReadinessTarget>(options: CreatePrismaModuleOptions<TClient, TService>): DynamicModule;
}
export declare function createPrismaModule<TClient extends PrismaClientLike, TService extends PrismaReadinessTarget>(options: CreatePrismaModuleOptions<TClient, TService>): DynamicModule;
export {};
