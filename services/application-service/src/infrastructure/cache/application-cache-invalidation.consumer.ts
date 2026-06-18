import {
  APPLICATION_CREATED_EVENT_NAME,
  APPLICATION_STATUS_UPDATED_EVENT_NAME,
  INTERVIEW_CHANGED_EVENT_NAME,
  OFFER_STATUS_CHANGED_EVENT_NAME
} from '@careerhub/contracts';
import {
  assertRabbitMqParkingDeadLetterTopology,
  assertRabbitMqTimedRetryTopology,
  getRabbitMqRetryCount,
  getRuntimeConfig,
  publishToRabbitMqRetryQueue,
  type EnvironmentVariables,
  type MetricsRegistry,
  type RabbitMqTimedRetryTopology
} from '@careerhub/infrastructure';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage
} from 'amqplib';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APPLICATION_PORT_TOKENS, type EmployerDashboardCache } from '../../application/ports';
import { APPLICATION_METRICS_TOKENS } from '../metrics/application-metrics.constants';
import type { ApplicationEnvironmentVariables } from '../../config/application-env.schema';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const DASHBOARD_CACHE_INVALIDATION_QUEUE = 'application.dashboard-cache-invalidation';
const RECONNECT_DELAY_MS = 5_000;
const CONSUMER_NAME = 'application-dashboard-cache-invalidation';
const RETRY_DELAY_STEPS_MS = [5_000, 15_000, 60_000] as const;

const DASHBOARD_CACHE_EVENT_NAMES = [
  APPLICATION_CREATED_EVENT_NAME,
  APPLICATION_STATUS_UPDATED_EVENT_NAME,
  INTERVIEW_CHANGED_EVENT_NAME,
  OFFER_STATUS_CHANGED_EVENT_NAME
] as const;

type DashboardCacheEventName = (typeof DASHBOARD_CACHE_EVENT_NAMES)[number];

type ApplicationEventPayload = {
  applicationId: string;
  candidateIdentityId: string;
  employerIdentityId: string;
  jobId: string;
};

function isDashboardCacheEvent(
  value: unknown
): value is { name: DashboardCacheEventName; payload: ApplicationEventPayload } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { name?: unknown; payload?: unknown };
  return (
    typeof v.name === 'string' &&
    (DASHBOARD_CACHE_EVENT_NAMES as readonly string[]).includes(v.name) &&
    typeof v.payload === 'object' &&
    v.payload !== null &&
    typeof (v.payload as ApplicationEventPayload).employerIdentityId === 'string'
  );
}

@Injectable()
export class ApplicationCacheInvalidationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApplicationCacheInvalidationConsumer.name);
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private retryTopology?: RabbitMqTimedRetryTopology;
  private shuttingDown = false;

  constructor(
    @Optional() @Inject(APPLICATION_PORT_TOKENS.dashboardCache)
    private readonly dashboardCache: EmployerDashboardCache | null,
    @Inject(APPLICATION_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<ApplicationEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      !!this.dashboardCache &&
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log(
        'Application cache invalidation consumer disabled; dashboard cache or broker URL missing'
      );
      return;
    }

    await this.connectAndSubscribe();
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

    await this.closeConnection();
  }

  private async connectAndSubscribe(): Promise<void> {
    if (this.connecting || this.shuttingDown) return;
    this.connecting = true;

    try {
      await this.closeConnection();
      await this.startConsumer();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to start application cache invalidation consumer: ${msg}`);
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private async startConsumer(): Promise<void> {
    this.connection = await connect(this.runtimeConfig.brokerUrl as string);
    this.channel = await this.connection.createConfirmChannel();
    const connection = this.connection;
    const channel = this.channel;

    connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (err: Error) => {
      this.logger.warn(
        `Application cache invalidation RabbitMQ connection error: ${err.message}`
      );
    });
    channel.on('close', () => {
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (err: Error) => {
      this.logger.warn(
        `Application cache invalidation RabbitMQ channel error: ${err.message}`
      );
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      DASHBOARD_CACHE_INVALIDATION_QUEUE
    );

    this.retryTopology = await assertRabbitMqTimedRetryTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      DASHBOARD_CACHE_INVALIDATION_QUEUE,
      APPLICATION_CREATED_EVENT_NAME,
      RETRY_DELAY_STEPS_MS
    );

    for (const eventName of DASHBOARD_CACHE_EVENT_NAMES) {
      await channel.bindQueue(topology.queue, topology.exchange, eventName);
    }

    await channel.prefetch(this.runtimeConfig.brokerPrefetchCount);

    const consumeResult = await channel.consume(
      topology.queue,
      (message) => {
        void this.handleMessage(channel, message);
      },
      { noAck: false }
    );

    this.consumerTag = consumeResult.consumerTag;
    this.logger.log(
      `Application cache invalidation consumer subscribed to ${DASHBOARD_CACHE_EVENT_NAMES.join(', ')}`
    );
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message || !this.dashboardCache) return;

    const startedAt = Date.now();
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch {
      this.logger.warn('Application cache invalidation: malformed JSON payload');
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName: 'unknown',
        reason: 'malformed_payload',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    if (!isDashboardCacheEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(
        `Application cache invalidation: unsupported event "${eventName}", skipping`
      );
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName,
        reason: 'unsupported_payload',
        service: this.runtimeConfig.serviceName,
        status: 'error'
      });
      channel.ack(message);
      return;
    }

    const { employerIdentityId } = parsed.payload;
    const retryCount = getRabbitMqRetryCount(message);

    try {
      await this.dashboardCache.invalidate(employerIdentityId);
      this.logger.debug(
        `Dashboard cache invalidated for employer: ${employerIdentityId}`
      );
      this.metricsRegistry.recordIntegrationConsumer({
        consumer: CONSUMER_NAME,
        eventName: parsed.name,
        reason: 'cache_invalidated',
        service: this.runtimeConfig.serviceName,
        status: 'processed'
      });
      this.metricsRegistry.recordIntegrationConsumerDuration?.({
        consumer: CONSUMER_NAME,
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'cache_invalidated',
        service: this.runtimeConfig.serviceName,
        status: 'processed'
      });
      channel.ack(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (retryCount >= 3) {
        this.logger.error(
          `Dashboard cache invalidation retries exhausted for employer "${employerIdentityId}" after ${retryCount} attempts: ${errorMessage}`
        );
        this.metricsRegistry.recordIntegrationConsumer({
          consumer: CONSUMER_NAME,
          eventName: parsed.name,
          reason: 'retry_exhausted',
          service: this.runtimeConfig.serviceName,
          status: 'error'
        });

        if (this.runtimeConfig.brokerDeadLetterEnabled) {
          channel.nack(message, false, false);
        } else {
          channel.ack(message);
        }
        return;
      }

      const retryTopology = this.retryTopology;

      if (!retryTopology || !this.runtimeConfig.brokerDeadLetterEnabled) {
        this.logger.warn(
          `Dashboard cache invalidation retry (immediate requeue) for employer "${employerIdentityId}" attempt ${retryCount + 1}: ${errorMessage}`
        );
        channel.nack(message, false, true);
        return;
      }

      try {
        await publishToRabbitMqRetryQueue(
          channel,
          this.runtimeConfig,
          message,
          retryTopology,
          retryCount + 1
        );
        this.logger.warn(
          `Retrying dashboard cache invalidation for employer "${employerIdentityId}" attempt ${retryCount + 1}: ${errorMessage}`
        );
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectAndSubscribe();
    }, RECONNECT_DELAY_MS);
  }

  private async closeConnection(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;
    this.channel = undefined;
    this.connection = undefined;
    this.consumerTag = undefined;
    this.retryTopology = undefined;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}
