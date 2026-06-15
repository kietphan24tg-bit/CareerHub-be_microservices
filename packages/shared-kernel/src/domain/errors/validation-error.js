"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
const domain_error_1 = require("./domain-error");
class ValidationError extends domain_error_1.DomainError {
    constructor(message, details) {
        super(message, {
            code: 'VALIDATION_ERROR',
            details
        });
    }
}
exports.ValidationError = ValidationError;
