import type { ReadinessCheck } from '../../observability/health/health.types';
export type DatabaseRuntimeConfig = {
    databaseUrl: string;
};
export type PrismaQueryable = {
    $queryRawUnsafe?: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
    $executeRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown>;
};
export type PrismaClientLike = PrismaQueryable & {
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
};
export type PrismaPingable = PrismaClientLike | {
    ping: () => Promise<unknown>;
};
export type PrismaReadinessCheck = ReadinessCheck;
export type PrismaReadinessTarget = PrismaClientLike | {
    ping: () => Promise<unknown>;
};
