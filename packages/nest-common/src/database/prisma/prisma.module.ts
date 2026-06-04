import {
    Module,
    type DynamicModule,
    type Provider
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.schema';
import { DEFAULT_DATABASE_RUNTIME_CONFIG } from '../database.constants';
import { getDatabaseRuntimeConfig } from '../database-runtime-config';
import { createDatabaseReadinessCheck } from './prisma-readiness';
import type {
    DatabaseRuntimeConfig,
    PrismaClientLike,
    PrismaReadinessCheck,
    PrismaReadinessTarget
} from '../database.types';

type ProviderToken = string | symbol | Function;

export type CreatePrismaModuleOptions<
    TClient extends PrismaClientLike,
    TService extends PrismaReadinessTarget
> = {
    clientToken: ProviderToken;
    createClient: (config: DatabaseRuntimeConfig) => TClient;
    createService: (client: TClient) => TService;
    exports?: ProviderToken[];
    readinessCheckName?: string;
    readinessCheckToken: ProviderToken;
    runtimeConfigToken?: ProviderToken;
    serviceToken: ProviderToken;
};

@Module({})
export class PrismaRuntimeModule {
    static register<
        TClient extends PrismaClientLike,
        TService extends PrismaReadinessTarget
    >(
        options: CreatePrismaModuleOptions<TClient, TService>
    ): DynamicModule {
        const runtimeConfigToken =
            options.runtimeConfigToken ?? DEFAULT_DATABASE_RUNTIME_CONFIG;

        const runtimeConfigProvider: Provider = {
            provide: runtimeConfigToken,
            inject: [ConfigService],
            useFactory: (
                configService: ConfigService<EnvironmentVariables, true>
            ): DatabaseRuntimeConfig => getDatabaseRuntimeConfig(configService)
        };

        const clientProvider: Provider = {
            provide: options.clientToken,
            inject: [runtimeConfigToken],
            useFactory: (config: DatabaseRuntimeConfig): TClient =>
                options.createClient(config)
        };

        const serviceProvider: Provider = {
            provide: options.serviceToken,
            inject: [options.clientToken],
            useFactory: (client: TClient): TService => options.createService(client)
        };

        const readinessProvider: Provider = {
            provide: options.readinessCheckToken,
            inject: [options.serviceToken],
            useFactory: (service: TService): PrismaReadinessCheck =>
                createDatabaseReadinessCheck(service, options.readinessCheckName)
        };

        return {
            exports: [
                runtimeConfigToken,
                options.clientToken,
                options.serviceToken,
                options.readinessCheckToken,
                ...(options.exports ?? [])
            ],
            module: PrismaRuntimeModule,
            providers: [
                runtimeConfigProvider,
                clientProvider,
                serviceProvider,
                readinessProvider
            ]
        };
    }
}

export function createPrismaModule<
    TClient extends PrismaClientLike,
    TService extends PrismaReadinessTarget
>(options: CreatePrismaModuleOptions<TClient, TService>): DynamicModule {
    return PrismaRuntimeModule.register(options);
}
