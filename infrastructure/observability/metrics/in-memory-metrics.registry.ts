import type {
    IntegrationConsumerDurationMetricRecord,
    HttpErrorMetricRecord,
    HttpMetricRecord,
    IntegrationConsumerMetricRecord,
    MetricsRegistry,
    OutboxBacklogMetricRecord,
    OutboxCleanupMetricRecord,
    OutboxPublishMetricRecord,
    RegisterCompensationMetricRecord,
    RmqMetricRecord,
    RpcMetricRecord
} from './metrics.types';

type CounterMetric = {
    help: string;
    name: string;
    type: 'counter';
    values: Map<string, number>;
};

type SummaryMetric = {
    count: Map<string, number>;
    help: string;
    name: string;
    sum: Map<string, number>;
    type: 'summary';
};

type GaugeMetric = {
    help: string;
    name: string;
    type: 'gauge';
    values: Map<string, number>;
};

function createLabelKey(labels: Record<string, string | number>): string {
    return Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join('|');
}

function renderLabels(labels: Record<string, string | number>): string {
    const serialized = Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
        .join(',');

    return serialized.length > 0 ? `{${serialized}}` : '';
}

export class InMemoryMetricsRegistry implements MetricsRegistry {
    private readonly httpErrorsTotal: CounterMetric = {
        help: 'Total number of HTTP error responses',
        name: 'careerhub_http_errors_total',
        type: 'counter',
        values: new Map()
    };

    private readonly httpRequestsDuration: SummaryMetric = {
        count: new Map(),
        help: 'HTTP request duration in milliseconds',
        name: 'careerhub_http_request_duration_ms',
        sum: new Map(),
        type: 'summary'
    };

    private readonly httpRequestsTotal: CounterMetric = {
        help: 'Total number of HTTP requests',
        name: 'careerhub_http_requests_total',
        type: 'counter',
        values: new Map()
    };

    private readonly rpcRequestsTotal: CounterMetric = {
        help: 'Total number of RPC handler executions',
        name: 'careerhub_rpc_requests_total',
        type: 'counter',
        values: new Map()
    };

    private readonly rpcErrorsTotal: CounterMetric = {
        help: 'Total number of RPC handler errors',
        name: 'careerhub_rpc_errors_total',
        type: 'counter',
        values: new Map()
    };

    private readonly rpcRequestsDuration: SummaryMetric = {
        count: new Map(),
        help: 'RPC request duration in milliseconds',
        name: 'careerhub_rpc_request_duration_ms',
        sum: new Map(),
        type: 'summary'
    };

    private readonly rmqMessagesTotal: CounterMetric = {
        help: 'Total number of RabbitMQ messages consumed',
        name: 'careerhub_rmq_messages_total',
        type: 'counter',
        values: new Map()
    };

    private readonly rmqErrorsTotal: CounterMetric = {
        help: 'Total number of RabbitMQ consumer errors',
        name: 'careerhub_rmq_errors_total',
        type: 'counter',
        values: new Map()
    };

    private readonly rmqMessagesDuration: SummaryMetric = {
        count: new Map(),
        help: 'RabbitMQ message processing duration in milliseconds',
        name: 'careerhub_rmq_message_duration_ms',
        sum: new Map(),
        type: 'summary'
    };

    private readonly outboxPublishTotal: CounterMetric = {
        help: 'Total number of outbox publish attempts',
        name: 'careerhub_outbox_publish_total',
        type: 'counter',
        values: new Map()
    };

    private readonly outboxCleanupDeletedTotal: CounterMetric = {
        help: 'Total number of processed outbox records deleted by cleanup',
        name: 'careerhub_outbox_cleanup_deleted_total',
        type: 'counter',
        values: new Map()
    };

    private readonly outboxBacklogGauge: GaugeMetric = {
        help: 'Current outbox backlog by status',
        name: 'careerhub_outbox_backlog',
        type: 'gauge',
        values: new Map()
    };

    private readonly outboxOldestPendingAgeGauge: GaugeMetric = {
        help: 'Age of the oldest pending outbox record in seconds',
        name: 'careerhub_outbox_oldest_pending_age_seconds',
        type: 'gauge',
        values: new Map()
    };

    private readonly integrationConsumerTotal: CounterMetric = {
        help: 'Total number of integration consumer outcomes',
        name: 'careerhub_integration_consumer_total',
        type: 'counter',
        values: new Map()
    };

    private readonly integrationConsumerDuration: SummaryMetric = {
        count: new Map(),
        help: 'Integration consumer processing duration in milliseconds',
        name: 'careerhub_integration_consumer_duration_ms',
        sum: new Map(),
        type: 'summary'
    };

    private readonly registerCompensationTotal: CounterMetric = {
        help: 'Total number of gateway register compensation outcomes',
        name: 'careerhub_register_compensation_total',
        type: 'counter',
        values: new Map()
    };

    recordHttpRequest(record: HttpMetricRecord): void {
        const labels = {
            method: record.method,
            route: record.route,
            status: record.statusCode
        };

        this.incrementCounter(this.httpRequestsTotal, labels);
        this.observeSummary(this.httpRequestsDuration, labels, record.durationMs);
    }

    recordHttpError(record: HttpErrorMetricRecord): void {
        this.incrementCounter(this.httpErrorsTotal, {
            method: record.method,
            route: record.route,
            status: record.statusCode
        });
    }

    recordIntegrationConsumer(record: IntegrationConsumerMetricRecord): void {
        this.incrementCounter(this.integrationConsumerTotal, {
            consumer: record.consumer,
            event_name: record.eventName,
            reason: record.reason ?? 'none',
            service: record.service,
            status: record.status
        });
    }

    recordIntegrationConsumerDuration(
        record: IntegrationConsumerDurationMetricRecord
    ): void {
        this.observeSummary(this.integrationConsumerDuration, {
            consumer: record.consumer,
            event_name: record.eventName,
            reason: record.reason ?? 'none',
            service: record.service,
            status: record.status
        }, record.durationMs);
    }

    recordRegisterCompensation(record: RegisterCompensationMetricRecord): void {
        this.incrementCounter(this.registerCompensationTotal, {
            action: record.action,
            flow: record.flow,
            reason: record.reason,
            service: record.service,
            status: record.status
        });
    }

    recordOutboxBacklog(record: OutboxBacklogMetricRecord): void {
        this.setGauge(this.outboxBacklogGauge, {
            service: record.service,
            status: 'pending'
        }, record.pending);
        this.setGauge(this.outboxBacklogGauge, {
            service: record.service,
            status: 'processing'
        }, record.processing);
        this.setGauge(this.outboxBacklogGauge, {
            service: record.service,
            status: 'failed'
        }, record.failed);

        this.setGauge(this.outboxOldestPendingAgeGauge, {
            service: record.service
        }, record.oldestPendingAgeSeconds ?? 0);
    }

    recordOutboxCleanup(record: OutboxCleanupMetricRecord): void {
        this.incrementCounter(this.outboxCleanupDeletedTotal, {
            service: record.service
        }, record.deletedCount);
    }

    recordOutboxPublish(record: OutboxPublishMetricRecord): void {
        this.incrementCounter(this.outboxPublishTotal, {
            event_name: record.eventName ?? 'unknown',
            service: record.service,
            status: record.status
        });
    }

    recordRpcRequest(record: RpcMetricRecord): void {
        const labels = {
            pattern: record.pattern,
            status: record.status
        };

        this.incrementCounter(this.rpcRequestsTotal, labels);
        this.observeSummary(this.rpcRequestsDuration, labels, record.durationMs);
    }

    recordRpcError(record: RpcMetricRecord): void {
        this.incrementCounter(this.rpcErrorsTotal, {
            pattern: record.pattern,
            status: record.status
        });
    }

    recordRmqRequest(record: RmqMetricRecord): void {
        const labels = this.createRmqLabels(record);

        this.incrementCounter(this.rmqMessagesTotal, labels);
        this.observeSummary(this.rmqMessagesDuration, labels, record.durationMs);
    }

    recordRmqError(record: RmqMetricRecord): void {
        this.incrementCounter(this.rmqErrorsTotal, this.createRmqLabels(record));
    }

    renderPrometheus(): string {
        return [
            this.renderCounterMetric(this.httpRequestsTotal),
            this.renderSummaryMetric(this.httpRequestsDuration),
            this.renderCounterMetric(this.httpErrorsTotal),
            this.renderCounterMetric(this.rpcRequestsTotal),
            this.renderSummaryMetric(this.rpcRequestsDuration),
            this.renderCounterMetric(this.rpcErrorsTotal),
            this.renderCounterMetric(this.rmqMessagesTotal),
            this.renderSummaryMetric(this.rmqMessagesDuration),
            this.renderCounterMetric(this.rmqErrorsTotal),
            this.renderCounterMetric(this.outboxPublishTotal),
            this.renderCounterMetric(this.outboxCleanupDeletedTotal),
            this.renderGaugeMetric(this.outboxBacklogGauge),
            this.renderGaugeMetric(this.outboxOldestPendingAgeGauge),
            this.renderCounterMetric(this.integrationConsumerTotal),
            this.renderSummaryMetric(this.integrationConsumerDuration),
            this.renderCounterMetric(this.registerCompensationTotal)
        ].join('\n');
    }

    private createRmqLabels(
        record: RmqMetricRecord
    ): Record<string, string | number> {
        return Object.fromEntries(
            Object.entries({
                exchange: record.exchange,
                pattern: record.pattern,
                queue: record.queue,
                routing_key: record.routingKey,
                service: record.service,
                status: record.status
            }).filter(([, value]) => value !== undefined && value !== '')
        ) as Record<string, string | number>;
    }

    private incrementCounter(
        metric: CounterMetric,
        labels: Record<string, string | number>,
        incrementBy = 1
    ): void {
        const key = createLabelKey(labels);
        const current = metric.values.get(key) ?? 0;
        metric.values.set(key, current + incrementBy);
    }

    private observeSummary(
        metric: SummaryMetric,
        labels: Record<string, string | number>,
        value: number
    ): void {
        const key = createLabelKey(labels);
        const currentCount = metric.count.get(key) ?? 0;
        const currentSum = metric.sum.get(key) ?? 0;

        metric.count.set(key, currentCount + 1);
        metric.sum.set(key, currentSum + value);
    }

    private renderCounterMetric(metric: CounterMetric): string {
        const lines = [
            `# HELP ${metric.name} ${metric.help}`,
            `# TYPE ${metric.name} ${metric.type}`
        ];

        for (const [key, value] of metric.values.entries()) {
            const labels = this.parseLabelKey(key);
            lines.push(`${metric.name}${renderLabels(labels)} ${value}`);
        }

        return lines.join('\n');
    }

    private renderSummaryMetric(metric: SummaryMetric): string {
        const lines = [
            `# HELP ${metric.name} ${metric.help}`,
            `# TYPE ${metric.name} ${metric.type}`
        ];

        for (const [key, count] of metric.count.entries()) {
            const labels = this.parseLabelKey(key);
            const sum = metric.sum.get(key) ?? 0;

            lines.push(`${metric.name}_count${renderLabels(labels)} ${count}`);
            lines.push(`${metric.name}_sum${renderLabels(labels)} ${sum}`);
        }

        return lines.join('\n');
    }

    private renderGaugeMetric(metric: GaugeMetric): string {
        const lines = [
            `# HELP ${metric.name} ${metric.help}`,
            `# TYPE ${metric.name} ${metric.type}`
        ];

        for (const [key, value] of metric.values.entries()) {
            const labels = this.parseLabelKey(key);
            lines.push(`${metric.name}${renderLabels(labels)} ${value}`);
        }

        return lines.join('\n');
    }

    private setGauge(
        metric: GaugeMetric,
        labels: Record<string, string | number>,
        value: number
    ): void {
        const key = createLabelKey(labels);
        metric.values.set(key, value);
    }

    private parseLabelKey(key: string): Record<string, string> {
        if (!key) {
            return {};
        }

        return key.split('|').reduce<Record<string, string>>((accumulator, entry) => {
            const [labelKey, ...valueParts] = entry.split('=');

            accumulator[labelKey] = valueParts.join('=');
            return accumulator;
        }, {});
    }
}
