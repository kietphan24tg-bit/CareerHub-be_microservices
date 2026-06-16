import {
  isRecruitmentMailInterviewEvent,
  isRecruitmentMailOfferEvent,
  type RecruitmentMailIntegrationEvent
} from '@careerhub/contracts';
import {
  assertRabbitMqParkingDeadLetterTopology,
  getRabbitMqRetryCount,
  getRuntimeConfig,
  republishRabbitMqMessageForRetry,
  type EnvironmentVariables,
  type MetricsRegistry,
  type RuntimeConfig
} from '@careerhub/infrastructure';
import {
  connect,
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage
} from 'amqplib';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IdGenerator, IdentityLookup, RecruitmentMailDeliveryRepository } from '../../application';
import { COMMUNICATION_PORT_TOKENS } from '../../application';
import {
  getCommunicationRuntimeConfig,
  type CommunicationEnvironmentVariables
} from '../../config';
import { COMMUNICATION_METRICS_TOKENS } from '../metrics/communication-metrics.constants';
import { MailConfigurationError, RecruitmentMailService } from '../mail/recruitment-mail.service';
import {
  RECRUITMENT_MAIL_CONSUMER,
  RECRUITMENT_MAIL_QUEUE,
  RECRUITMENT_MAIL_ROUTING_KEYS
} from './recruitment-mail.constants';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const RECONNECT_DELAY_MS = 5_000;

type RecruitmentMailOutcomeReason =
  | 'config_error'
  | 'dead_lettered'
  | 'duplicate'
  | 'mail_sent'
  | 'malformed_payload'
  | 'recipient_not_found'
  | 'retry_scheduled'
  | 'unsupported_payload';

function isRecruitmentMailEvent(value: unknown): value is RecruitmentMailIntegrationEvent {
  return isRecruitmentMailInterviewEvent(value) || isRecruitmentMailOfferEvent(value);
}

@Injectable()
export class RecruitmentMailConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly claimTimeoutMs: number;
  private readonly communicationRuntimeConfig: ReturnType<typeof getCommunicationRuntimeConfig>;
  private readonly logger = new Logger(RecruitmentMailConsumer.name);
  private readonly runtimeConfig: RuntimeConfig;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private shuttingDown = false;

  constructor(
    private readonly mailService: RecruitmentMailService,
    @Inject(COMMUNICATION_PORT_TOKENS.recruitmentMailDeliveryRepository)
    private readonly mailDeliveryRepository: RecruitmentMailDeliveryRepository,
    @Inject(COMMUNICATION_PORT_TOKENS.identityLookup)
    private readonly identityLookup: IdentityLookup,
    @Inject(COMMUNICATION_PORT_TOKENS.idGenerator)
    private readonly idGenerator: IdGenerator,
    @Inject(COMMUNICATION_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<CommunicationEnvironmentVariables & EnvironmentVariables, true>
  ) {
    this.communicationRuntimeConfig = getCommunicationRuntimeConfig(configService);
    this.claimTimeoutMs = this.communicationRuntimeConfig.mailDeliveryClaimTimeoutMs;
    this.runtimeConfig = getRuntimeConfig(configService);
  }

  isEnabled(): boolean {
    return (
      typeof this.runtimeConfig.brokerUrl === 'string' &&
      this.runtimeConfig.brokerUrl.length > 0
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.log('Recruitment mail consumer is disabled; broker URL is missing');
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

  private getMaxRetryCount(event: RecruitmentMailIntegrationEvent): number {
    return isRecruitmentMailOfferEvent(event)
      ? this.communicationRuntimeConfig.mailOfferMaxRetries
      : this.communicationRuntimeConfig.mailInterviewMaxRetries;
  }

  private async connectAndSubscribe(): Promise<void> {
    if (this.connecting || this.shuttingDown) {
      return;
    }

    this.connecting = true;

    try {
      await this.closeConnection();
      await this.startConsumer();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown RabbitMQ consumer error';
      this.logger.warn(`Failed to start recruitment mail consumer: ${errorMessage}`);
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
      this.logger.warn('Recruitment mail RabbitMQ connection closed');
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (error: Error) => {
      this.logger.warn(`Recruitment mail RabbitMQ connection error: ${error.message}`);
    });
    channel.on('close', () => {
      this.logger.warn('Recruitment mail RabbitMQ channel closed');
      this.channel = undefined;
      this.consumerTag = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (error: Error) => {
      this.logger.warn(`Recruitment mail RabbitMQ channel error: ${error.message}`);
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      RECRUITMENT_MAIL_QUEUE
    );

    for (const routingKey of RECRUITMENT_MAIL_ROUTING_KEYS) {
      await channel.bindQueue(topology.queue, topology.exchange, routingKey);
    }

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
    this.logger.log(
      `Recruitment mail consumer subscribed to ${RECRUITMENT_MAIL_QUEUE} ` +
        `with routing keys [${RECRUITMENT_MAIL_ROUTING_KEYS.join(', ')}]`
    );
  }

  async handleMessage(channel: ConfirmChannel, message: ConsumeMessage | null): Promise<void> {
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
        `Ignoring malformed recruitment mail event: ${errorMessage} (messageId=${messageId})`
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

    if (!isRecruitmentMailEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(
        `Ignoring unsupported recruitment mail event payload (eventName=${eventName}, messageId=${messageId})`
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

    const retryCount = getRabbitMqRetryCount(message);
    const maxRetryCount = this.getMaxRetryCount(parsed);
    const now = new Date();
    const staleClaimCutoff = new Date(now.getTime() - this.claimTimeoutMs);
    const claimResult = await this.mailDeliveryRepository.claimDelivery({
      deliveryId: this.idGenerator.generate(),
      eventName: parsed.name,
      now,
      recipientIdentityId: parsed.payload.recipientIdentityId,
      sourceEventId: parsed.payload.sourceEventId,
      staleClaimCutoff
    });

    if (claimResult === 'duplicate_sent' || claimResult === 'duplicate_in_flight') {
      this.logger.log(
        `Skipping duplicate recruitment mail delivery for sourceEventId=${parsed.payload.sourceEventId} ` +
          `(result=${claimResult}, messageId=${messageId})`
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'duplicate',
        status: 'duplicate'
      });
      channel.ack(message);
      return;
    }

    try {
      const email = await this.identityLookup.findEmailByIdentityId(
        parsed.payload.recipientIdentityId,
        parsed.requestId
      );

      if (!email) {
        throw new Error(
          `Recipient email was not found for identity ${parsed.payload.recipientIdentityId}`
        );
      }

      if (isRecruitmentMailInterviewEvent(parsed)) {
        await this.mailService.sendInterviewMail({
          email,
          payload: parsed.payload
        });
      } else {
        await this.mailService.sendOfferMail({
          email,
          payload: parsed.payload
        });
      }

      await this.mailDeliveryRepository.markSent(parsed.payload.sourceEventId, new Date());

      this.logger.log(
        `Recruitment mail sent (eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${parsed.payload.sourceEventId})`
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'mail_sent',
        status: 'processed'
      });
      channel.ack(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown recruitment mail error';
      const isRecipientNotFound = errorMessage.includes('Recipient email was not found');

      if (error instanceof MailConfigurationError) {
        await this.mailDeliveryRepository.markFailed(
          parsed.payload.sourceEventId,
          new Date(),
          errorMessage
        );
        this.logger.error(
          `Recruitment mail is not configured: ${error.message} (eventName=${parsed.name}, messageId=${messageId})`
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'config_error',
          status: 'error'
        });

        if (this.runtimeConfig.brokerDeadLetterEnabled) {
          this.recordConsumerOutcome({
            durationMs: Date.now() - startedAt,
            eventName: parsed.name,
            reason: 'dead_lettered',
            status: 'dead_lettered'
          });
          channel.nack(message, false, false);
        } else {
          channel.ack(message);
        }
        return;
      }

      if (retryCount < maxRetryCount) {
        await this.mailDeliveryRepository.clearClaim(parsed.payload.sourceEventId);

        try {
          await republishRabbitMqMessageForRetry(
            channel,
            this.runtimeConfig,
            message,
            OUTBOX_EVENTS_EXCHANGE,
            retryCount + 1
          );
          this.logger.warn(
            `Retrying recruitment mail event attempt ${retryCount + 1}/${maxRetryCount}: ${errorMessage} ` +
              `(eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${parsed.payload.sourceEventId})`
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

      await this.mailDeliveryRepository.markFailed(
        parsed.payload.sourceEventId,
        new Date(),
        errorMessage
      );

      if (isRecipientNotFound) {
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'recipient_not_found',
          status: 'error'
        });
      }

      if (this.runtimeConfig.brokerDeadLetterEnabled) {
        this.logger.warn(
          `Recruitment mail event dead-lettered after ${retryCount} retries: ${errorMessage} ` +
            `(eventName=${parsed.name}, messageId=${messageId}, sourceEventId=${parsed.payload.sourceEventId})`
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

      this.logger.error(
        `Recruitment mail processing failed with retries disabled: ${errorMessage} (eventName=${parsed.name}, messageId=${messageId})`
      );
      channel.nack(message, false, true);
    }
  }

  private recordConsumerOutcome(input: {
    durationMs: number;
    eventName: string;
    reason: RecruitmentMailOutcomeReason;
    status: 'dead_lettered' | 'duplicate' | 'error' | 'processed';
  }): void {
    this.metricsRegistry.recordIntegrationConsumer({
      consumer: RECRUITMENT_MAIL_CONSUMER,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
    this.metricsRegistry.recordIntegrationConsumerDuration?.({
      consumer: RECRUITMENT_MAIL_CONSUMER,
      durationMs: input.durationMs,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) {
      return;
    }

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

    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}
