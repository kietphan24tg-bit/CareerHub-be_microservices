import { InfrastructureError } from '../../errors/infrastructure-error';
import type {
    PrismaReadinessTarget,
    PrismaQueryable,
    PrismaReadinessCheck
} from '../database.types';

function isPingable(
    clientOrService: PrismaReadinessTarget
): clientOrService is { ping: () => Promise<unknown> } {
    return typeof (clientOrService as { ping?: unknown }).ping === 'function';
}

function isQueryable(
    clientOrService: PrismaReadinessTarget
): clientOrService is PrismaQueryable {
    return (
        typeof (clientOrService as PrismaQueryable).$queryRawUnsafe ===
            'function' ||
        typeof (clientOrService as PrismaQueryable).$executeRawUnsafe ===
            'function'
    );
}

async function pingDatabase(
    clientOrService: PrismaReadinessTarget
): Promise<unknown> {
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

    throw new InfrastructureError('Database readiness check is unsupported', {
        code: 'DATABASE_READINESS_UNSUPPORTED'
    });
}

export function createDatabaseReadinessCheck(
    clientOrService: PrismaReadinessTarget,
    name = 'database'
): PrismaReadinessCheck {
    return {
        check: () => pingDatabase(clientOrService),
        name
    };
}
