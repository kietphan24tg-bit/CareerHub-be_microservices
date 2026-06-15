import {
  getRuntimeConfig,
  RabbitMqOutboxPublisher,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getApplicationRuntimeConfig,
  type ApplicationEnvironmentVariables
} from '../../config';
import type { EnvironmentVariables } from '@careerhub/infrastructure';
import { APPLICATION_METRICS_TOKENS } from '../metrics/application-metrics.constants';

@Injectable()
export class ApplicationOutboxPublisher implements OnModuleDestroy {
  private readonly publisher: RabbitMqOutboxPublisher;

  constructor(
    @Inject(APPLICATION_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    configService: ConfigService<ApplicationEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const applicationRuntimeConfig = getApplicationRuntimeConfig(configService);
    this.publisher = new RabbitMqOutboxPublisher(
      metricsRegistry,
      getRuntimeConfig(configService),
      {
        loggerName: ApplicationOutboxPublisher.name,
        publishEnabled: applicationRuntimeConfig.outboxPublishEnabled
      }
    );
  }

  isEnabled(): boolean {
    return this.publisher.isEnabled();
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.close();
  }

  async publish(record: OutboxRecord): Promise<void> {
    await this.publisher.publish(record);
  }
}
