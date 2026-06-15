import {
  IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
  type IamPasswordResetRequestedIntegrationEvent
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
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getIamRuntimeConfig,
  type IamEnvironmentVariables
} from '../../config';
import {
  IAM_PORT_TOKENS,
  type PasswordResetTokenRepository
} from '../../application';
import { IAM_METRICS_TOKENS } from '../metrics/iam-metrics.constants';
import { PasswordResetTokenFactory } from '../auth/password-reset-token.factory';
import { MailConfigurationError, MailService } from './mail.service';
import { Inject } from '@nestjs/common';

const OUTBOX_EVENTS_EXCHANGE = 'events';
const PASSWORD_RESET_MAIL_QUEUE = 'iam.password-reset-mail';
const RECONNECT_DELAY_MS = 5_000;
const PASSWORD_RESET_MAIL_CONSUMER = 'iam-password-reset-mail';
const EMAIL_RETRY_DELAY_STEPS_MS = [30_000, 120_000, 600_000] as const;

type PasswordResetMailOutcomeReason =
  | 'config_error'
  | 'dead_lettered'
  | 'duplicate_or_in_flight'
  | 'mail_sent'
  | 'malformed_payload'
  | 'republish_failed'
  | 'retry_exhausted'
  | 'retry_scheduled'
  | 'unsupported_payload';

function isPasswordResetRequestedEvent(
  value: unknown
): value is IamPasswordResetRequestedIntegrationEvent {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as IamPasswordResetRequestedIntegrationEvent).name ===
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload ===
      'object' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload.email ===
      'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload.expiresAt ===
      'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload
      .identityId === 'string' &&
    typeof (value as IamPasswordResetRequestedIntegrationEvent).payload
      .resetTokenId === 'string'
  );
}

@Injectable()
export class IamPasswordResetMailConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly claimTimeoutMs: number;
  private readonly logger = new Logger(IamPasswordResetMailConsumer.name);
  private readonly maxRetryCount: number;
  private readonly runtimeConfig: ReturnType<typeof getRuntimeConfig>;
  private channel?: ConfirmChannel;
  private connecting = false;
  private connection?: ChannelModel;
  private consumerTag?: string;
  private reconnectTimer?: NodeJS.Timeout;
  private retryTopology?: RabbitMqTimedRetryTopology;
  private shuttingDown = false;

  constructor(
    private readonly mailService: MailService,
    private readonly passwordResetTokenFactory: PasswordResetTokenFactory,
    @Inject(IAM_PORT_TOKENS.passwordResetTokenRepository)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(IAM_METRICS_TOKENS.registry)
    private readonly metricsRegistry: MetricsRegistry,
    configService: ConfigService<IamEnvironmentVariables & EnvironmentVariables, true>
  ) {
    const iamRuntimeConfig = getIamRuntimeConfig(configService);
    this.claimTimeoutMs = iamRuntimeConfig.passwordResetMailClaimTimeoutMs;
    this.maxRetryCount = iamRuntimeConfig.passwordResetMailMaxRetries;
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
      this.logger.log('Password reset mail consumer is disabled; broker URL is missing');
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
      this.logger.warn(`Failed to start password reset mail consumer: ${errorMessage}`);
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
      this.logger.warn('Password reset mail RabbitMQ connection closed');
      this.connection = undefined;
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    connection.on('error', (error: Error) => {
      this.logger.warn(
        `Password reset mail RabbitMQ connection error: ${error.message}`
      );
    });
    channel.on('close', () => {
      this.logger.warn('Password reset mail RabbitMQ channel closed');
      this.channel = undefined;
      this.consumerTag = undefined;
      this.retryTopology = undefined;
      this.scheduleReconnect();
    });
    channel.on('error', (error: Error) => {
      this.logger.warn(`Password reset mail RabbitMQ channel error: ${error.message}`);
    });

    const topology = await assertRabbitMqParkingDeadLetterTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      PASSWORD_RESET_MAIL_QUEUE
    );

    this.retryTopology = await assertRabbitMqTimedRetryTopology(
      channel,
      this.runtimeConfig,
      OUTBOX_EVENTS_EXCHANGE,
      PASSWORD_RESET_MAIL_QUEUE,
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME,
      EMAIL_RETRY_DELAY_STEPS_MS
    );

    if (!this.runtimeConfig.brokerDeadLetterEnabled) {
      this.logger.warn(
        'Password reset mail retry queues and DLQ DISABLED (BROKER_DEAD_LETTER_ENABLED=false). ' +
          'Retry exhausted will requeue instead of parking — NOT recommended for production.'
      );
    } else {
      this.logger.log(
        `Password reset mail retry topology: queues=[${this.retryTopology.retryQueues.join(', ')}], ` +
          `dlq=${topology.deadLetterQueue}`
      );
    }

    await channel.bindQueue(
      topology.queue,
      topology.exchange,
      IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME
    );
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
      `Password reset mail consumer subscribed to ${IAM_PASSWORD_RESET_REQUESTED_EVENT_NAME}`
    );
  }

  private async handleMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage | null
  ): Promise<void> {
    if (!message) {
      return;
    }

    const startedAt = Date.now();
    let parsed: unknown;

    try {
      parsed = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid JSON payload';
      this.logger.warn(
        `Ignoring malformed password reset mail event: ${errorMessage}`,
        this.buildLogContext({
          eventName: 'unknown',
          message,
          retryCount: getRabbitMqRetryCount(message)
        })
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

    if (!isPasswordResetRequestedEvent(parsed)) {
      const eventName =
        typeof (parsed as { name?: unknown }).name === 'string'
          ? (parsed as { name: string }).name
          : 'unknown';
      this.logger.warn(
        'Ignoring unsupported password reset mail event payload',
        this.buildLogContext({
          eventName,
          message,
          retryCount: getRabbitMqRetryCount(message)
        })
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

    const now = new Date();
    const retryCount = getRabbitMqRetryCount(message);
    const claimed = await this.passwordResetTokenRepository.claimMailDelivery(
      parsed.payload.resetTokenId,
      now,
      new Date(now.getTime() - this.claimTimeoutMs)
    );

    if (!claimed) {
      this.logger.log(
        `Skipping duplicate or in-flight password reset mail event for token ${parsed.payload.resetTokenId}`,
        this.buildLogContext({
          eventName: parsed.name,
          message,
          payload: parsed.payload,
          requestId: parsed.requestId,
          retryCount
        })
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'duplicate_or_in_flight',
        status: 'duplicate'
      });
      channel.ack(message);
      return;
    }

    try {
      const resetToken = this.passwordResetTokenFactory.createToken({
        expiresAt: parsed.payload.expiresAt,
        identityId: parsed.payload.identityId,
        tokenId: parsed.payload.resetTokenId
      });

      await this.mailService.sendPasswordResetMail({
        email: parsed.payload.email,
        expiresAt: parsed.payload.expiresAt,
        identityId: parsed.payload.identityId,
        resetToken
      });
      await this.passwordResetTokenRepository.markMailSent(
        parsed.payload.resetTokenId,
        new Date()
      );
      this.logger.log(
        'Password reset mail sent and acknowledged',
        this.buildLogContext({
          eventName: parsed.name,
          message,
          payload: parsed.payload,
          requestId: parsed.requestId,
          retryCount
        })
      );
      this.recordConsumerOutcome({
        durationMs: Date.now() - startedAt,
        eventName: parsed.name,
        reason: 'mail_sent',
        status: 'processed'
      });
      channel.ack(message);
    } catch (error) {
      if (error instanceof MailConfigurationError) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.error(
          `Password reset mail is not configured: ${error.message}`,
          this.buildLogContext({
            eventName: parsed.name,
            message,
            payload: parsed.payload,
            requestId: parsed.requestId,
            retryCount
          })
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
          this.logger.warn(
            'DLQ disabled — dropping config_error message silently (BROKER_DEAD_LETTER_ENABLED=false)'
          );
          channel.ack(message);
        }
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown password reset mail error';

      if (retryCount >= this.maxRetryCount) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.error(
          `Password reset mail retries exhausted for message ${message.properties.messageId ?? 'unknown'} after ${retryCount} retries: ${errorMessage}`,
          this.buildLogContext({
            eventName: parsed.name,
            message,
            payload: parsed.payload,
            requestId: parsed.requestId,
            retryCount
          })
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'retry_exhausted',
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

      const retryTopology = this.retryTopology;

      if (!retryTopology || !this.runtimeConfig.brokerDeadLetterEnabled) {
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        this.logger.warn(
          `Password reset mail retry scheduled (immediate requeue, DLQ disabled) attempt ${retryCount + 1}/${this.maxRetryCount}: ${errorMessage}`,
          this.buildLogContext({
            eventName: parsed.name,
            message,
            payload: parsed.payload,
            requestId: parsed.requestId,
            retryCount: retryCount + 1
          })
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'retry_scheduled',
          status: 'error'
        });
        channel.nack(message, false, true);
        return;
      }

      try {
        // Clear claim before publishing to retry queue so that when the message
        // returns after the TTL delay, claimMailDelivery can succeed again.
        await this.passwordResetTokenRepository.clearMailDeliveryClaim(
          parsed.payload.resetTokenId
        );
        await publishToRabbitMqRetryQueue(
          channel,
          this.runtimeConfig,
          message,
          retryTopology,
          retryCount + 1
        );
        this.logger.warn(
          `Retrying password reset mail event ${message.properties.messageId ?? 'unknown'} attempt ${retryCount + 1}/${this.maxRetryCount}: ${errorMessage}`,
          this.buildLogContext({
            eventName: parsed.name,
            message,
            payload: parsed.payload,
            requestId: parsed.requestId,
            retryCount: retryCount + 1
          })
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'retry_scheduled',
          status: 'error'
        });
        channel.ack(message);
      } catch (retryError) {
        const retryErrorMessage =
          retryError instanceof Error
            ? retryError.message
            : 'Unknown retry scheduling error';
        this.logger.warn(
          `Failed to schedule password reset mail retry: ${retryErrorMessage}`,
          this.buildLogContext({
            eventName: parsed.name,
            message,
            payload: parsed.payload,
            requestId: parsed.requestId,
            retryCount: retryCount + 1
          })
        );
        this.recordConsumerOutcome({
          durationMs: Date.now() - startedAt,
          eventName: parsed.name,
          reason: 'republish_failed',
          status: 'error'
        });
        channel.nack(message, false, false);
      }
    }
  }

  private recordConsumerOutcome(input: {
    durationMs: number;
    eventName: string;
    reason: PasswordResetMailOutcomeReason;
    status: 'dead_lettered' | 'duplicate' | 'error' | 'processed';
  }): void {
    this.metricsRegistry.recordIntegrationConsumer({
      consumer: PASSWORD_RESET_MAIL_CONSUMER,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
    this.metricsRegistry.recordIntegrationConsumerDuration?.({
      consumer: PASSWORD_RESET_MAIL_CONSUMER,
      durationMs: input.durationMs,
      eventName: input.eventName,
      reason: input.reason,
      service: this.runtimeConfig.serviceName,
      status: input.status
    });
  }

  private buildLogContext(input: {
    eventName: string;
    message: ConsumeMessage;
    payload?: IamPasswordResetRequestedIntegrationEvent['payload'];
    requestId?: string;
    retryCount: number;
  }): Record<string, string | number | undefined> {
    return {
      consumer: PASSWORD_RESET_MAIL_CONSUMER,
      email: input.payload?.email,
      eventName: input.eventName,
      identityId: input.payload?.identityId,
      messageId: input.message.properties.messageId,
      requestId: input.requestId,
      resetTokenId: input.payload?.resetTokenId,
      retryCount: input.retryCount
    };
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
    this.retryTopology = undefined;

    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}
