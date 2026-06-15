import type { OutboxRecord } from '@careerhub/contracts';
import type { MetricsRegistry } from '../../observability/metrics/metrics.types';
import type { RuntimeConfig } from '../../runtime/config/runtime-config';
export type RabbitMqOutboxPublisherOptions = {
    exchangeName?: string;
    loggerName?: string;
    publishEnabled?: boolean;
};
export declare class RabbitMqOutboxPublisher {
    private readonly metricsRegistry;
    private readonly runtimeConfig;
    private readonly exchangeName;
    private readonly logger;
    private readonly publishEnabled;
    private channelPromise?;
    private connectionPromise?;
    constructor(metricsRegistry: MetricsRegistry, runtimeConfig: RuntimeConfig, options?: RabbitMqOutboxPublisherOptions);
    isEnabled(): boolean;
    close(): Promise<void>;
    publish(record: OutboxRecord): Promise<void>;
    private getChannel;
    private getConnection;
}
