import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  configureHttpRuntime,
  getRuntimeConfig,
  initializeOpenTelemetry,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { GatewayEnvironmentVariables } from './config/gateway-env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const configService = app.get(
    ConfigService<GatewayEnvironmentVariables & EnvironmentVariables, true>
  );
  const runtimeConfig = getRuntimeConfig(configService);
  initializeOpenTelemetry(runtimeConfig);

  configureHttpRuntime(app, {
    runtimeConfig
  });

  await app.listen(runtimeConfig.port);
}

void bootstrap();
