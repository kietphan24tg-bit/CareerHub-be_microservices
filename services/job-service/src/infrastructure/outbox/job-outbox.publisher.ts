import {
  getRuntimeConfig,
  RabbitMqOutboxPublisher,
  type MetricsRegistry,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getJobRuntimeConfig, type JobEnvironmentVariables } from '../../config';
import { JOB_METRICS_TOKENS } from '../metrics/job-metrics.constants';

@Injectable()
export class JobOutboxPublisher implements OnModuleDestroy {
  private readonly publisher: RabbitMqOutboxPublisher;

  constructor(
    @Inject(JOB_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    configService: ConfigService<JobEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const jobRuntimeConfig = getJobRuntimeConfig(configService);
    this.publisher = new RabbitMqOutboxPublisher(
      metricsRegistry,
      getRuntimeConfig(configService),
      {
        loggerName: JobOutboxPublisher.name,
        publishEnabled: jobRuntimeConfig.outboxPublishEnabled
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
