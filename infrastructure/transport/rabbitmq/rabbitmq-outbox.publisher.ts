import type { IntegrationEvent, OutboxRecord } from '@careerhub/contracts';
import { Logger } from '@nestjs/common';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import type { MetricsRegistry } from '../../observability/metrics/metrics.types';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
import { createRabbitMqHeaders } from './rabbitmq-request-context';
import { getRabbitMqExchangeName } from './rabbitmq-transport-options';

const DEFAULT_OUTBOX_EXCHANGE = 'events';

function isIntegrationEvent(value: unknown): value is IntegrationEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as IntegrationEvent).name === 'string' &&
    typeof (value as IntegrationEvent).occurredAt === 'string' &&
    typeof (value as IntegrationEvent).version === 'number'
  );
}

export type RabbitMqOutboxPublisherOptions = {
  exchangeName?: string;
  loggerName?: string;
  publishEnabled?: boolean;
};

export class RabbitMqOutboxPublisher {
  private readonly exchangeName: string;
  private readonly logger: Logger;
  private readonly publishEnabled: boolean;
  private channelPromise?: Promise<ConfirmChannel>;
  private connectionPromise?: Promise<ChannelModel>;

  constructor(
    private readonly metricsRegistry: MetricsRegistry,
    private readonly runtimeConfig: RuntimeConfig,
    options?: RabbitMqOutboxPublisherOptions
  ) {
    this.exchangeName = options?.exchangeName ?? DEFAULT_OUTBOX_EXCHANGE;
    this.logger = new Logger(options?.loggerName ?? RabbitMqOutboxPublisher.name);
    this.publishEnabled = options?.publishEnabled ?? true;
  }

  isEnabled(): boolean {
    return (
      this.publishEnabled &&
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async close(): Promise<void> {
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
    const exchange = getRabbitMqExchangeName(this.runtimeConfig, this.exchangeName);

    try {
      channel.publish(exchange, record.eventName, Buffer.from(JSON.stringify(event)), {
        contentType: 'application/json',
        deliveryMode: this.runtimeConfig.brokerDurable ? 2 : 1,
        headers: createRabbitMqHeaders(event.requestId),
        messageId: record.id,
        timestamp: Date.now(),
        type: record.eventName
      });

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
            this.exchangeName
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
        })
        .catch((error: unknown) => {
          this.channelPromise = undefined;
          throw error;
        });
    }

    return this.channelPromise;
  }

  private async getConnection(): Promise<ChannelModel> {
    if (!this.connectionPromise) {
      this.connectionPromise = connect(this.runtimeConfig.brokerUrl as string)
        .then((connection) => {
          connection.on('close', () => {
            this.connectionPromise = undefined;
          });
          connection.on('error', (error: Error) => {
            this.logger.warn(`RabbitMQ connection error: ${error.message}`);
            this.connectionPromise = undefined;
          });

          return connection;
        })
        .catch((error: unknown) => {
          this.connectionPromise = undefined;
          throw error;
        });
    }

    return this.connectionPromise;
  }
}
