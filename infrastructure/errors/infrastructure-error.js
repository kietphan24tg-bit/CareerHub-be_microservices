"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureError = void 0;
class InfrastructureError extends Error {
    code;
    details;
    constructor(message, options) {
        super(message, options?.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options?.code ?? 'INFRASTRUCTURE_ERROR';
        this.details = options?.details;
    }
}
exports.InfrastructureError = InfrastructureError;
