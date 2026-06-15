import {
  isNotificationRequestedEvent,
  type NotificationRequestedIntegrationEvent
} from '@careerhub/contracts';
import {
  assertRabbitMqParkingDeadLetterTopology,
  getRabbitMqRetryCount,
  getRuntimeConfig,
  republishRabbitMqMessageForRetry,
  type EnvironmentVariables,
  type MetricsRegistry,
  type RabbitMqParkingDeadLetterTopology
} from '@careerhub/infrastructure';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage
} from 'amqplib';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getCommunicationRuntimeConfig,
  type CommunicationEnvironmentVariables
} from '../../config';
import { NotificationOperationsService } from '../../application';
import { COMMUNICATION_METRICS_TOKENS } from '../metrics/communication-metrics.constants';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const NOTIFICATIONS_QUEUE = 'communication.notifications';
const NOTIFICATIONS_ROUTING_PATTERN = 'notifications.#';
const RECONNECT_DELAY_MS = 5_000;
const NOTIFICATIONS_CONSUMER = 'communication-notifications';

type NotificationConsumerOutcomeReason =
  | 'created'
  | 'dead_lettered'
  | 'duplicate'
  | 'malformed_payload'
  | 'processing_failed'
  | 'retry_scheduled'
  | 'unsupported_payload';

export function buildNotificationConsumerTopologyMessages(input: {
  deadLetterEnabled: boolean;
  routingPattern: string;
  topology: RabbitMqParkingDeadLetterTopology;
}): Array<{ level: 'log' | 'warn'; message: string }> {
  const messages: Array<{ level: 'log' | 'warn'; message: string }> = [
    {
      level: 'log',
      message:
        `Notification consumer broker topology: exchange=${input.topology.exchange}, ` +
        `queue=${input.topology.queue}, routingPattern=${input.routingPattern}`
    }
  ];

  if (input.deadLetterEnabled) {
    messages.push({
      level: 'log',
      message:
        `Notification consumer parking DLQ enabled: dlx=${input.topology.deadLetterExchange}, ` +
        `dlq=${input.topology.deadLetterQueue}, dlqRoutingKey=${input.topology.deadLetterRoutingKey}`
    });
  } else {
    messages.push({
      level: 'warn',
      message:
        'Notification consumer parking DLQ DISABLED (BROKER_DEAD_LETTER_ENABLED=false). ' +
        'Processing failures will nack with requeue=true — NOT recommended for production. ' +
        'Set BROKER_DEAD_LETTER_ENABLED=true for production readiness.'
    });
  }

  return messages;
}

@Injectable()
export class CommunicationNotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationNotificationConsumer.name);
  private readonly maxRetryCount: number;
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private shuttingDown = false;

  constructor(
    private readonly notificationOperationsService: NotificationOperationsService,
    @Inject(COMMUNICATION_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<CommunicationEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.runtimeConfig = getRuntimeConfig(configService);
    const commConfig = getCommunicationRuntimeConfig(configService);
    this.maxRetryCount = commConfig.notificationMaxRetries;
  }

  isEnabled(): boolean {
    return (
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log('Notification consumer disabled because BROKER_URL is not configured');
      return;
    }

    await this.ensureConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag).catch(() => undefined);
    }

    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = undefined;
    this.connection = undefined;
    this.consumerTag = undefined;
  }

  private async ensureConsumer(): Promise<void> {
    if (this.shuttingDown || this.connecting || this.channel) {
      return;
    }

    this.connecting = true;

    try {
      await this.startConsumer();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to start notification consumer: ${reason}`);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.ensureConsumer();
    }, RECONNECT_DELAY_MS);
  }

  private async startConsumer(): Promise<void> {
    this.connection = await connect(this.runtimeConfig.brokerUrl as string);
    this.channel = await this.connection.createConfirmChannel();
    const connection = this.connection;
    const channel = this.channel;

    connection.on('close', () => {
      this.logger.warn('Notification RabbitMQ connection closed');
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (error: Error) => {
      this.logger.warn(`Notification RabbitMQ connection error: ${error.message}`);
    });
    channel.on('close', () => {
      this.logger.warn('Notification RabbitMQ channel closed');
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (error: Error) => {
      this.logger.warn(`Notification RabbitMQ channel error: ${error.message}`);
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      NOTIFICATIONS_QUEUE
    );
    await channel.bindQueue(topology.queue, topology.exchange, NOTIFICATIONS_ROUTING_PATTERN);
    await channel.prefetch(this.runtimeConfig.brokerPrefetchCount);

    const consumeResult = await channel.consume(
      topology.queue,
      (message) => {
        void this.handleMessage(channel, message);
      },
      {
        noAck: false
      }
    );

    this.consumerTag = consumeResult.consumerTag;

    for (const entry of buildNotificationConsumerTopologyMessages({
      deadLetterEnabled: this.runtimeConfig.brokerDeadLetterEnabled,
      routingPattern: NOTIFICATIONS_ROUTING_PATTERN,
      topology
    })) {
      if (entry.level === 'warn') {
        this.logger.warn(entry.message);
      } else {
        this.logger.log(entry.message);
      }
    }

    this.logger.log(
      `Notification consumer subscribed to ${NOTIFICATIONS_ROUTING_PATTERN} on ${topology.queue}`
    );
  }

  async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message) {
      return;
    }

    const startedAt = Date.now();
    const messageId = message.properties.messageId ?? 'unknown';
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON payload';
      this.logger.warn(
        `Ignoring malformed notification event: ${errorMessage} (messageId=${messageId})`
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: 'unknown',
        reason: 'malformed_payload',
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    if (!isNotificationRequestedEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(
        `Ignoring unsupported notification event payload (eventName=${eventName}, messageId=${messageId})`
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName,
        reason: 'unsupported_payload',
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    try {
      const outcome = await this.processNotificationEvent(parsed);
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: outcome,
        status: outcome === 'duplicate' ? 'duplicate' : 'processed'
      });
      channel.ack(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown notification error';
      const retryCount = getRabbitMqRetryCount(message);
      const sourceEventId = parsed.payload.sourceEventId;

      if (retryCount < this.maxRetryCount) {
        try {
          await republishRabbitMqMessageForRetry(
            channel,
            this.runtimeConfig,
            message,
            OUTBOX_EVENTS_EXCHANGE,
            retryCount + 1
          );
          this.logger.warn(
            `Retrying notification event attempt ${retryCount + 1}/${this.maxRetryCount}: ${errorMessage} ` +
              `(eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${sourceEventId})`
          );
          this.recordConsumerOutcome({
            durationMs: Date.now() - startedAt,
            eventName: parsed.name,
            reason: 'retry_scheduled',
            status: 'error'
          });
          channel.ack(message);
        } catch {
          channel.nack(message, false, this.runtimeConfig.brokerDeadLetterEnabled ? false : true);
        }
        return;
      }

      if (this.runtimeConfig.brokerDeadLetterEnabled) {
        this.logger.warn(
          `Notification event dead-lettered after ${retryCount} retries: ${errorMessage} ` +
            `(eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${sourceEventId})`
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'dead_lettered',
          status: 'dead_lettered'
        });
        channel.nack(message, false, false);
        return;
      }

      this.logger.warn(
        `Notification event processing failed: ${errorMessage} (eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${sourceEventId})`
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'processing_failed',
        status: 'error'
      });
      channel.nack(message, false, true);
    }
  }

  private async processNotificationEvent(
    event: NotificationRequestedIntegrationEvent
  ): Promise<NotificationConsumerOutcomeReason> {
    const result = await this.notificationOperationsService.createNotificationIfNew({
      identityId: event.payload.recipientIdentityId,
      message: event.payload.message,
      metadataJson: JSON.stringify(event.payload.metadata),
      sourceEventId: event.payload.sourceEventId,
      title: event.payload.title,
      type: event.payload.type
    });

    return result.created ? 'created' : 'duplicate';
  }

  private recordConsumerOutcome(input: {
    durationMs: number;
    eventName: string;
    reason: NotificationConsumerOutcomeReason;
    status: 'dead_lettered' | 'duplicate' | 'error' | 'processed';
  }): void {
    this.metricsRegistry.recordIntegrationConsumer({
      consumer: NOTIFICATIONS_CONSUMER,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
    this.metricsRegistry.recordIntegrationConsumerDuration?.({
      consumer: NOTIFICATIONS_CONSUMER,
      durationMs: input.durationMs,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
  }
}
