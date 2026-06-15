export type DomainErrorOptions = {
    code?: string;
    details?: unknown;
    cause?: Error;
};
export declare class DomainError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, options?: DomainErrorOptions);
}
