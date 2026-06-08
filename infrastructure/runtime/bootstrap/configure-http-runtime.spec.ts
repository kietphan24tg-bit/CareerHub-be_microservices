import 'reflect-metadata';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureHttpRuntime } from './configure-http-runtime';
import type { RuntimeConfig } from '../config/runtime-config';

@Controller()
class TestController {
    @Get('/hello')
    getHello() {
        return {
            data: {
                hello: 'world'
            },
            message: 'Hello loaded'
        };
    }
}

@Module({
    controllers: [TestController]
})
class TestModule {}

const runtimeConfig: RuntimeConfig = {
    brokerDeadLetterEnabled: true,
    brokerDeadLetterPrefix: 'dlq',
    brokerDurable: true,
    brokerExchangePrefix: '',
    brokerPrefetchCount: 10,
    brokerQueuePrefix: '',
    brokerUrl: undefined,
    databaseUrl: undefined,
    healthEnabled: true,
    healthLivenessPath: '/health/live',
    healthPath: '/health',
    healthReadinessPath: '/health/ready',
    httpLogEnabled: true,
    logFilePath: undefined,
    logLevel: 'info',
    logPretty: false,
    metricsEnabled: true,
    metricsPath: '/metrics',
    nodeEnv: 'test',
    otelEnabled: false,
    otelExporterOtlpEndpoint: undefined,
    otelExporterOtlpProtocol: undefined,
    otelServiceName: undefined,
    otelTracesSampler: undefined,
    otelTracesSamplerArg: undefined,
    port: 0,
    redisUrl: undefined,
    serviceName: 'test-service'
};

async function createApp(
    overrides: Partial<RuntimeConfig> = {}
): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [TestModule]
    }).compile();
    const app = moduleRef.createNestApplication();

    configureHttpRuntime(app, {
        runtimeConfig: {
            ...runtimeConfig,
            ...overrides
        }
    });

    await app.listen(0);
    return app;
}

function getBaseUrl(app: INestApplication): string {
    const address = app.getHttpServer().address();

    if (!address || typeof address === 'string') {
        throw new Error('Unable to resolve test server address');
    }

    return `http://127.0.0.1:${address.port}`;
}

async function performRequest(
    url: string
): Promise<{ body: string; headers: Record<string, string | string[] | undefined>; statusCode: number }> {
    return new Promise((resolve, reject) => {
        const request = httpRequest(
            url,
            {
                headers: {
                    connection: 'close'
                }
            },
            (response) => {
                let body = '';

                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    resolve({
                        body,
                        headers: response.headers,
                        statusCode: response.statusCode ?? 0
                    });
                });
            }
        );

        request.on('error', reject);
        request.end();
    });
}

test('health and metrics endpoints are lightweight and HTTP metrics exclude health routes', async () => {
    const app = await createApp();

    try {
        const baseUrl = getBaseUrl(app);
        const healthResponse = await performRequest(`${baseUrl}/health`);
        const healthBody = JSON.parse(healthResponse.body) as {
            checks?: Array<{ name: string }>;
            service?: string;
            status?: string;
            success?: boolean;
        };

        assert.equal(healthResponse.statusCode, 200);
        assert.equal(healthBody.success, undefined);
        assert.equal(healthBody.service, 'test-service');
        assert.equal(healthBody.status, 'up');

        await performRequest(`${baseUrl}/hello`);

        const metricsResponse = await performRequest(`${baseUrl}/metrics`);

        assert.match(
            String(metricsResponse.headers['content-type']),
            /^text\/plain;.*version=0\.0\.4$/
        );
        assert.match(
            metricsResponse.body,
            /careerhub_http_requests_total\{method="GET",route="\/hello",status="200"\} 1/
        );
        assert.doesNotMatch(metricsResponse.body, /route="\/health"/);
        assert.doesNotMatch(metricsResponse.body, /route="\/metrics"/);
    } finally {
        await app.close();
    }
});

test('metrics and health endpoints can be disabled from runtime config', async () => {
    const app = await createApp({
        healthEnabled: false,
        metricsEnabled: false
    });

    try {
        const baseUrl = getBaseUrl(app);
        const healthResponse = await performRequest(`${baseUrl}/health`);
        const metricsResponse = await performRequest(`${baseUrl}/metrics`);

        assert.equal(healthResponse.statusCode, 404);
        assert.equal(metricsResponse.statusCode, 404);
    } finally {
        await app.close();
    }
});

test('custom metrics and health paths come from runtime config', async () => {
    const app = await createApp({
        healthLivenessPath: '/livez',
        healthPath: '/status',
        healthReadinessPath: '/readyz',
        metricsPath: '/internal/metrics'
    });

    try {
        const baseUrl = getBaseUrl(app);
        const healthResponse = await performRequest(`${baseUrl}/status`);
        const livenessResponse = await performRequest(`${baseUrl}/livez`);
        const readinessResponse = await performRequest(`${baseUrl}/readyz`);
        const metricsResponse = await performRequest(`${baseUrl}/internal/metrics`);
        const oldHealthResponse = await performRequest(`${baseUrl}/health`);
        const oldMetricsResponse = await performRequest(`${baseUrl}/metrics`);

        assert.equal(healthResponse.statusCode, 200);
        assert.equal(livenessResponse.statusCode, 200);
        assert.equal(readinessResponse.statusCode, 200);
        assert.equal(metricsResponse.statusCode, 200);
        assert.equal(oldHealthResponse.statusCode, 404);
        assert.equal(oldMetricsResponse.statusCode, 404);
    } finally {
        await app.close();
    }
});
