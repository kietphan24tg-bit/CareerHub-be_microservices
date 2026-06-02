export type InfrastructureErrorOptions = {
    code?: string;
    details?: unknown;
    cause?: Error;
};

export class InfrastructureError extends Error {
    readonly code: string;
    readonly details?: unknown;

    constructor(message: string, options?: InfrastructureErrorOptions) {
        super(message, options?.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options?.code ?? 'INFRASTRUCTURE_ERROR';
        this.details = options?.details;
    }
}
