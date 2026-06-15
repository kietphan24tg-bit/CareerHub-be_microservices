export type CorrelationContext = {
    requestId?: string;
};
export declare function bindCorrelationContext(values: CorrelationContext): void;
export declare function runWithCorrelationContext<TValue>(values: CorrelationContext, callback: () => TValue): TValue;
export declare function getCorrelationContext(): CorrelationContext;
export declare function getActiveTraceIdentifiers(): {
    spanId?: string;
    traceId?: string;
};
