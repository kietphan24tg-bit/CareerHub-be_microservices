import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EnvironmentVariables,
  type MetricsRegistry,
  OutboxProcessor
} from '@careerhub/infrastructure';
import { getIamRuntimeConfig, type IamEnvironmentVariables } from '../../config';
import { IAM_PORT_TOKENS, type OutboxRepository } from '../../application';
import { IamOutboxPublisher } from './iam-outbox.publisher';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';

@Injectable()
export class IamOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly processor: OutboxProcessor;

  constructor(
    @Inject(IAM_PORT_TOKENS.outboxRepository)
    outboxRepository: OutboxRepository,
    @Inject(IAM_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    outboxPublisher: IamOutboxPublisher,
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const runtimeConfig = getIamRuntimeConfig(configService);
    this.processor = new OutboxProcessor({
      disabledLogMessage:
        'IAM outbox publisher is disabled or broker URL is missing',
      loggerName: IamOutboxProcessor.name,
      metricsRegistry,
      publisher: outboxPublisher,
      repository: outboxRepository,
      runtimeConfig,
      serviceName: 'iam-service'
    });
  }

  async onModuleInit(): Promise<void> {
    await this.processor.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.processor.onModuleDestroy();
  }

  private async runCleanupCycle(): Promise<void> {
    await this.processor.runCleanupCycle();
  }

  private async runPublishCycle(): Promise<void> {
    await this.processor.runPublishCycle();
  }

  private async runBacklogCycle(): Promise<void> {
    await this.processor.runBacklogCycle();
  }
}
