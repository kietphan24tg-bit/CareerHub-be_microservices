export type ApplicationErrorOptions = {
    code: string;
    details?: unknown;
    cause?: Error;
};

export class ApplicationError extends Error {
    readonly code: string;
    readonly details?: unknown;

    constructor(message: string, options: ApplicationErrorOptions) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options.code;
        this.details = options.details;
    }
}
