import { DomainError } from './domain-error';

export class ValidationError extends DomainError {
    constructor(message: string, details?: unknown) {
        super(message, {
            code: 'VALIDATION_ERROR',
            details
        });
    }
}
