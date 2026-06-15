export type ApplicationErrorOptions = {
    code: string;
    details?: unknown;
    cause?: Error;
};
export declare class ApplicationError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, options: ApplicationErrorOptions);
}
