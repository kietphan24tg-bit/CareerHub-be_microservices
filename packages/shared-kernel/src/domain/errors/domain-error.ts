export type DomainErrorOptions = {
    code?: string;
    details?: unknown;
    cause?: Error;
};

export class DomainError extends Error {
    readonly code: string;
    readonly details?: unknown;

    constructor(message: string, options?: DomainErrorOptions) {
        super(message, options?.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options?.code ?? 'DOMAIN_ERROR';
        this.details = options?.details;
    }
}
