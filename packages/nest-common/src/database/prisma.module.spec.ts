import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { createRuntimeConfigModule } from '../config/runtime-config';
import { createPrismaModule } from './prisma/prisma.module';
import { PrismaLifecycleService } from './prisma/prisma-lifecycle.service';
import type {
    DatabaseRuntimeConfig,
    PrismaClientLike,
    PrismaReadinessCheck
} from './database.types';

const TEST_PRISMA_CLIENT = Symbol('TEST_PRISMA_CLIENT');
const TEST_PRISMA_SERVICE = Symbol('TEST_PRISMA_SERVICE');
const TEST_PRISMA_READINESS_CHECK = Symbol('TEST_PRISMA_READINESS_CHECK');

class FakePrismaClient implements PrismaClientLike {
    connectCalls = 0;
    disconnectCalls = 0;
    queries: string[] = [];

    constructor(readonly databaseUrl: string) {}

    async $connect(): Promise<void> {
        this.connectCalls += 1;
    }

    async $disconnect(): Promise<void> {
        this.disconnectCalls += 1;
    }

    async $queryRawUnsafe<T = unknown>(query: string): Promise<T> {
        this.queries.push(query);
        return { database: 'up' } as T;
    }
}

class FakePrismaService extends PrismaLifecycleService<FakePrismaClient> {}

test('registers a prisma module with client, service, and readiness check', async () => {
    process.env.DATABASE_URL =
        'postgresql://careerhub:test@localhost:5432/careerhub';
    process.env.SERVICE_NAME = 'test-service';

    const moduleRef = await Test.createTestingModule({
        imports: [
            createRuntimeConfigModule(),
            createPrismaModule({
                clientToken: TEST_PRISMA_CLIENT,
                createClient: (config: DatabaseRuntimeConfig) =>
                    new FakePrismaClient(config.databaseUrl),
                createService: (client) => new FakePrismaService(client),
                readinessCheckName: 'prisma',
                readinessCheckToken: TEST_PRISMA_READINESS_CHECK,
                serviceToken: TEST_PRISMA_SERVICE
            })
        ]
    }).compile();

    const client = moduleRef.get<FakePrismaClient>(TEST_PRISMA_CLIENT);
    const service = moduleRef.get<FakePrismaService>(TEST_PRISMA_SERVICE);
    const readinessCheck = moduleRef.get<PrismaReadinessCheck>(
        TEST_PRISMA_READINESS_CHECK
    );

    await service.onModuleInit();
    const readiness = await readinessCheck.check();
    await service.onApplicationShutdown();

    assert.equal(
        client.databaseUrl,
        'postgresql://careerhub:test@localhost:5432/careerhub'
    );
    assert.ok(service instanceof FakePrismaService);
    assert.equal(client.connectCalls, 1);
    assert.equal(client.disconnectCalls, 1);
    assert.deepEqual(readiness, { database: 'up' });
    assert.deepEqual(client.queries, ['SELECT 1']);

    await moduleRef.close();
});
