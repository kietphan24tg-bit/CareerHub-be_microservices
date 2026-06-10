import {
  getRuntimeConfig,
  RabbitMqOutboxPublisher,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import type { OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getIamRuntimeConfig,
  type IamEnvironmentVariables
} from '../../config';
import type { EnvironmentVariables } from '@careerhub/infrastructure';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';

@Injectable()
export class IamOutboxPublisher implements OnModuleDestroy {
  private readonly publisher: RabbitMqOutboxPublisher;

  constructor(
    @Inject(IAM_METRICS_TOKENS.registry)
    metricsRegistry: MetricsRegistry,
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const iamRuntimeConfig = getIamRuntimeConfig(configService);
    this.publisher = new RabbitMqOutboxPublisher(
      metricsRegistry,
      getRuntimeConfig(configService),
      {
        loggerName: IamOutboxPublisher.name,
        publishEnabled: iamRuntimeConfig.outboxPublishEnabled
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
