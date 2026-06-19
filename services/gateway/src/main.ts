import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  type EnvironmentVariables,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GATEWAY_METRICS_TOKENS } from './config/gateway.constants';
import type { GatewayEnvironmentVariables } from './config/gateway-env.schema';
import { getGatewayRuntimeConfig } from './config/gateway-runtime-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<GatewayEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const gatewayRuntimeConfig = getGatewayRuntimeConfig(configService);
  const metricsRegistry = app.get<MetricsRegistry>(GATEWAY_METRICS_TOKENS.registry);
  initializeOpenTelemetry(runtimeConfig);

  if (gatewayRuntimeConfig.corsOrigin) {
    const origins = gatewayRuntimeConfig.corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true,
      methods: ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
      origin: origins.length === 1 && origins[0] === '*' ? '*' : origins
    });
  }

  configureHttpRuntime(app, {
    metricsRegistry,
    runtimeConfig
  });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CareerHub API')
      .setDescription('CareerHub microservices REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(runtimeConfig.port);
}

void bootstrap();
