"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainError = void 0;
class DomainError extends Error {
    code;
    details;
    constructor(message, options) {
        super(message, options?.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options?.code ?? 'DOMAIN_ERROR';
        this.details = options?.details;
    }
}
exports.DomainError = DomainError;
