import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EnvironmentVariables,
  type MetricsRegistry,
  OutboxProcessor
} from '@careerhub/infrastructure';
import {
  getApplicationRuntimeConfig,
  type ApplicationEnvironmentVariables
} from '../../config';
import { APPLICATION_PORT_TOKENS, type OutboxRepository } from '../../application';
import { ApplicationOutboxPublisher } from './application-outbox.publisher';
import { APPLICATION_METRICS_TOKENS } from '../metrics/application-metrics.constants';

@Injectable()
export class ApplicationOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly processor: OutboxProcessor;

  constructor(
    @Inject(APPLICATION_PORT_TOKENS.outboxRepository)
    outboxRepository: OutboxRepository,
    @Inject(APPLICATION_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    outboxPublisher: ApplicationOutboxPublisher,
    configService: ConfigService<ApplicationEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const runtimeConfig = getApplicationRuntimeConfig(configService);
    this.processor = new OutboxProcessor({
      disabledLogMessage:
        'Application outbox publisher is disabled or broker URL is missing',
      loggerName: ApplicationOutboxProcessor.name,
      metricsRegistry,
      publisher: outboxPublisher,
      repository: outboxRepository,
      runtimeConfig,
      serviceName: 'application-service'
    });
  }

  async onModuleInit(): Promise<void> {
    await this.processor.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.processor.onModuleDestroy();
  }
}
