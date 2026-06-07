import 'reflect-metadata';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureHttpRuntime } from '@careerhub/infrastructure';
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
    brokerUrl: undefined,
    databaseUrl: undefined,
    httpLogEnabled: true,
    logFilePath: undefined,
    logLevel: 'info',
    logPretty: false,
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

async function createApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [TestModule]
    }).compile();
    const app = moduleRef.createNestApplication();

    configureHttpRuntime(app, {
        runtimeConfig
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
