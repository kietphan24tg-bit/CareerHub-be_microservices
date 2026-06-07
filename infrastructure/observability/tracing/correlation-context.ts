import { AsyncLocalStorage } from 'node:async_hooks';
import { context, trace } from '@opentelemetry/api';

export type CorrelationContext = {
    requestId?: string;
};

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function bindCorrelationContext(values: CorrelationContext): void {
    correlationStorage.enterWith({
        ...correlationStorage.getStore(),
        ...values
    });
}

export function runWithCorrelationContext<TValue>(
    values: CorrelationContext,
    callback: () => TValue
): TValue {
    return correlationStorage.run(
        {
            ...correlationStorage.getStore(),
            ...values
        },
        callback
    );
}

export function getCorrelationContext(): CorrelationContext {
    return correlationStorage.getStore() ?? {};
}

export function getActiveTraceIdentifiers(): {
    spanId?: string;
    traceId?: string;
} {
    const activeSpan = trace.getSpan(context.active());
    const spanContext = activeSpan?.spanContext();

    if (!spanContext) {
        return {};
    }

    return {
        spanId: spanContext.spanId,
        traceId: spanContext.traceId
    };
}
