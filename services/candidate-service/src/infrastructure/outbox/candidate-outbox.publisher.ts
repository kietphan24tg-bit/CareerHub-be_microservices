import {
  getRuntimeConfig,
  RabbitMqOutboxPublisher,
  type MetricsRegistry,
  type EnvironmentVariables
} from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getCandidateRuntimeConfig,
  type CandidateEnvironmentVariables
} from '../../config';
import { CANDIDATE_METRICS_TOKENS } from '../metrics/candidate-metrics.constants';

@Injectable()
export class CandidateOutboxPublisher implements OnModuleDestroy {
  private readonly publisher: RabbitMqOutboxPublisher;

  constructor(
    @Inject(CANDIDATE_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    configService: ConfigService<
      CandidateEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {
    const candidateRuntimeConfig = getCandidateRuntimeConfig(configService);
    this.publisher = new RabbitMqOutboxPublisher(
      metricsRegistry,
      getRuntimeConfig(configService),
      {
        loggerName: CandidateOutboxPublisher.name,
        publishEnabled: candidateRuntimeConfig.outboxPublishEnabled
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
