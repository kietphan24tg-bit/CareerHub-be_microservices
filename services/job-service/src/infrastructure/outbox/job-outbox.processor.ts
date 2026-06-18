import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EnvironmentVariables,
  type MetricsRegistry,
  OutboxProcessor
} from '@careerhub/infrastructure';
import { getJobRuntimeConfig, type JobEnvironmentVariables } from '../../config';
import { JOB_PORT_TOKENS, type OutboxRepository } from '../../application';
import { JobOutboxPublisher } from './job-outbox.publisher';
import { JOB_METRICS_TOKENS } from '../metrics/job-metrics.constants';

@Injectable()
export class JobOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly processor: OutboxProcessor;

  constructor(
    @Inject(JOB_PORT_TOKENS.outboxRepository)
    outboxRepository: OutboxRepository,
    @Inject(JOB_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    outboxPublisher: JobOutboxPublisher,
    configService: ConfigService<JobEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const runtimeConfig = getJobRuntimeConfig(configService);
    this.processor = new OutboxProcessor({
      disabledLogMessage: 'Job outbox publisher is disabled or broker URL is missing',
      loggerName: JobOutboxProcessor.name,
      metricsRegistry,
      publisher: outboxPublisher,
      repository: outboxRepository,
      runtimeConfig,
      serviceName: 'job-service'
    });
  }

  async onModuleInit(): Promise<void> {
    await this.processor.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.processor.onModuleDestroy();
  }
}
