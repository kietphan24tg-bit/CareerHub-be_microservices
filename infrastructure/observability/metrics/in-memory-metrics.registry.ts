import type {
    HttpErrorMetricRecord,
    HttpMetricRecord,
    MetricsRegistry,
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
            this.renderCounterMetric(this.rmqErrorsTotal)
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
        labels: Record<string, string | number>
    ): void {
        const key = createLabelKey(labels);
        const current = metric.values.get(key) ?? 0;
        metric.values.set(key, current + 1);
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
