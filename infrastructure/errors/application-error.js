"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationError = void 0;
class ApplicationError extends Error {
    code;
    details;
    constructor(message, options) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = new.target.name;
        this.code = options.code;
        this.details = options.details;
    }
}
exports.ApplicationError = ApplicationError;
