import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  type EnvironmentVariables,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GATEWAY_METRICS_TOKENS } from './config/gateway.constants';
import type { GatewayEnvironmentVariables } from './config/gateway-env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<GatewayEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  const metricsRegistry = app.get<MetricsRegistry>(GATEWAY_METRICS_TOKENS.registry);
  initializeOpenTelemetry(runtimeConfig);

  configureHttpRuntime(app, {
    metricsRegistry,
    runtimeConfig
  });

  await app.listen(runtimeConfig.port);
}

void bootstrap();
