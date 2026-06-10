import type { EnvironmentVariables, MetricsRegistry } from '@careerhub/infrastructure';
import { OutboxProcessor } from '@careerhub/infrastructure';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getCandidateRuntimeConfig,
  type CandidateEnvironmentVariables
} from '../../config';
import {
  CANDIDATE_PORT_TOKENS,
  type CandidateOutboxRepository
} from '../../application';
import { CandidateOutboxPublisher } from './candidate-outbox.publisher';
import { CANDIDATE_METRICS_TOKENS } from '../metrics/candidate-metrics.constants';

@Injectable()
export class CandidateOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly processor: OutboxProcessor;

  constructor(
    @Inject(CANDIDATE_PORT_TOKENS.outboxRepository)
    outboxRepository: CandidateOutboxRepository,
    @Inject(CANDIDATE_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    outboxPublisher: CandidateOutboxPublisher,
    configService: ConfigService<
      CandidateEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {
    const runtimeConfig = getCandidateRuntimeConfig(configService);
    this.processor = new OutboxProcessor({
      disabledLogMessage:
        'Candidate outbox publisher is disabled or broker URL is missing',
      loggerName: CandidateOutboxProcessor.name,
      metricsRegistry,
      publisher: outboxPublisher,
      repository: outboxRepository,
      runtimeConfig,
      serviceName: 'candidate-service'
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
