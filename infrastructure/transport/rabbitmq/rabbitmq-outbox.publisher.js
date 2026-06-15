"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMqOutboxPublisher = void 0;
const common_1 = require("@nestjs/common");
const amqplib_1 = require("amqplib");
const rabbitmq_request_context_1 = require("./rabbitmq-request-context");
const rabbitmq_transport_options_1 = require("./rabbitmq-transport-options");
const DEFAULT_OUTBOX_EXCHANGE = 'events';
function isIntegrationEvent(value) {
    return (!!value &&
        typeof value === 'object' &&
        typeof value.name === 'string' &&
        typeof value.occurredAt === 'string' &&
        typeof value.version === 'number');
}
class RabbitMqOutboxPublisher {
    metricsRegistry;
    runtimeConfig;
    exchangeName;
    logger;
    publishEnabled;
    channelPromise;
    connectionPromise;
    constructor(metricsRegistry, runtimeConfig, options) {
        this.metricsRegistry = metricsRegistry;
        this.runtimeConfig = runtimeConfig;
        this.exchangeName = options?.exchangeName ?? DEFAULT_OUTBOX_EXCHANGE;
        this.logger = new common_1.Logger(options?.loggerName ?? RabbitMqOutboxPublisher.name);
        this.publishEnabled = options?.publishEnabled ?? true;
    }
    isEnabled() {
        return (this.publishEnabled &&
            typeof this.runtimeConfig.brokerUrl === 'string' &&
            this.runtimeConfig.brokerUrl.length > 0);
    }
    async close() {
        const channel = this.channelPromise ? await this.channelPromise : undefined;
        const connection = this.connectionPromise
            ? await this.connectionPromise
            : undefined;
        this.channelPromise = undefined;
        this.connectionPromise = undefined;
        await channel?.close();
        await connection?.close();
    }
    async publish(record) {
        const channel = await this.getChannel();
        const event = isIntegrationEvent(record.payload)
            ? record.payload
            : {
                name: record.eventName,
                occurredAt: record.occurredAt,
                payload: record.payload,
                version: 1
            };
        const exchange = (0, rabbitmq_transport_options_1.getRabbitMqExchangeName)(this.runtimeConfig, this.exchangeName);
        try {
            channel.publish(exchange, record.eventName, Buffer.from(JSON.stringify(event)), {
                contentType: 'application/json',
                deliveryMode: this.runtimeConfig.brokerDurable ? 2 : 1,
                headers: (0, rabbitmq_request_context_1.createRabbitMqHeaders)(event.requestId),
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
        }
        catch (error) {
            this.metricsRegistry.recordOutboxPublish({
                eventName: record.eventName,
                service: this.runtimeConfig.serviceName,
                status: 'error'
            });
            throw error;
        }
    }
    async getChannel() {
        if (!this.channelPromise) {
            this.channelPromise = this.getConnection()
                .then((connection) => connection.createConfirmChannel())
                .then(async (channel) => {
                const exchange = (0, rabbitmq_transport_options_1.getRabbitMqExchangeName)(this.runtimeConfig, this.exchangeName);
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
    async getConnection() {
        if (!this.connectionPromise) {
            this.connectionPromise = (0, amqplib_1.connect)(this.runtimeConfig.brokerUrl).then((connection) => {
                connection.on('close', () => {
                    this.connectionPromise = undefined;
                });
                connection.on('error', (error) => {
                    this.logger.warn(`RabbitMQ connection error: ${error.message}`);
                    this.connectionPromise = undefined;
                });
                return connection;
            });
        }
        return this.connectionPromise;
    }
}
exports.RabbitMqOutboxPublisher = RabbitMqOutboxPublisher;
