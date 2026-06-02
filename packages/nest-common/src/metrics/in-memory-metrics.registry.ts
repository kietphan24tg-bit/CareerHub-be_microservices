import type {
    HttpErrorMetricRecord,
    HttpMetricRecord,
    MetricsRegistry,
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
        this.incrementCounter(this.rpcRequestsTotal, {
            pattern: record.pattern,
            status: record.status
        });
    }

    renderPrometheus(): string {
        return [
            this.renderCounterMetric(this.httpRequestsTotal),
            this.renderSummaryMetric(this.httpRequestsDuration),
            this.renderCounterMetric(this.httpErrorsTotal),
            this.renderCounterMetric(this.rpcRequestsTotal)
        ].join('\n');
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
