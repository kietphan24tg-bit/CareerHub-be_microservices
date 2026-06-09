import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import {
  createRabbitMqHeaders,
  getRabbitMqExchangeName,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getIamRuntimeConfig,
  type IamEnvironmentVariables,
  type IamRuntimeConfig
} from '../../config';
import { getRuntimeConfig, type EnvironmentVariables } from '@careerhub/infrastructure';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';

const OUTBOX_EVENTS_EXCHANGE = 'events';

function isIntegrationEvent(value: unknown): value is IntegrationEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as IntegrationEvent).name === 'string' &&
    typeof (value as IntegrationEvent).occurredAt === 'string' &&
    typeof (value as IntegrationEvent).version === 'number'
  );
}

@Injectable()
export class IamOutboxPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(IamOutboxPublisher.name);
  private readonly iamRuntimeConfig: IamRuntimeConfig;
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channelPromise?: Promise<ConfirmChannel>;
  private connectionPromise?: Promise<ChannelModel>;

  constructor(
    @Inject(IAM_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    private readonly configService: ConfigService<
      IamEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {
    this.iamRuntimeConfig = getIamRuntimeConfig(configService);
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      this.iamRuntimeConfig.outboxPublishEnabled &&
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleDestroy(): Promise<void> {
    const channel = this.channelPromise ? await this.channelPromise : undefined;
    const connection = this.connectionPromise
      ? await this.connectionPromise
      : undefined;

    this.channelPromise = undefined;
    this.connectionPromise = undefined;

    await channel?.close();
    await connection?.close();
  }

  async publish(record: OutboxRecord): Promise<void> {
    const channel = await this.getChannel();
    const event = isIntegrationEvent(record.payload)
      ? record.payload
      : {
          name: record.eventName,
          occurredAt: record.occurredAt,
          payload: record.payload,
          version: 1 as const
        };
    const exchange = getRabbitMqExchangeName(this.runtimeConfig, OUTBOX_EVENTS_EXCHANGE);

    try {
      channel.publish(
        exchange,
        record.eventName,
        Buffer.from(JSON.stringify(event)),
        {
          contentType: 'application/json',
          deliveryMode: this.runtimeConfig.brokerDurable ? 2 : 1,
          headers: createRabbitMqHeaders(event.requestId),
          messageId: record.id,
          timestamp: Date.now(),
          type: record.eventName
        }
      );

      await channel.waitForConfirms();
      this.metricsRegistry.recordOutboxPublish({
        eventName: record.eventName,
        service: this.runtimeConfig.serviceName,
        status: 'success'
      });
    } catch (error) {
      this.metricsRegistry.recordOutboxPublish({
        eventName: record.eventName,
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      throw error;
    }
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (!this.channelPromise) {
      this.channelPromise = this.getConnection()
        .then((connection) => connection.createConfirmChannel())
        .then(async (channel) => {
          const exchange = getRabbitMqExchangeName(
            this.runtimeConfig,
            OUTBOX_EVENTS_EXCHANGE
          );

          await channel.assertExchange(exchange, 'topic', {
            durable: this.runtimeConfig.brokerDurable
          });

          channel.on('close', () => {
            this.channelPromise = undefined;
          });
          channel.on('error', (error) => {
            this.logger.warn(`RabbitMQ channel error: ${error.message}`);
            this.channelPromise = undefined;
          });

          return channel;
        });
    }

    return this.channelPromise;
  }

  private async getConnection(): Promise<ChannelModel> {
    if (!this.connectionPromise) {
      this.connectionPromise = connect(this.runtimeConfig.brokerUrl as string).then(
        (connection) => {
          connection.on('close', () => {
            this.connectionPromise = undefined;
          });
          connection.on('error', (error: Error) => {
            this.logger.warn(`RabbitMQ connection error: ${error.message}`);
            this.connectionPromise = undefined;
          });

          return connection;
        }
      );
    }

    return this.connectionPromise;
  }
}
