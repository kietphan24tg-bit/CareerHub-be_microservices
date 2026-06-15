import { DomainError } from './domain-error';
export declare class ValidationError extends DomainError {
    constructor(message: string, details?: unknown);
}
