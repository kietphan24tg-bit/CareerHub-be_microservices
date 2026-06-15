export type InfrastructureErrorOptions = {
    code?: string;
    details?: unknown;
    cause?: Error;
};
export declare class InfrastructureError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, options?: InfrastructureErrorOptions);
}
