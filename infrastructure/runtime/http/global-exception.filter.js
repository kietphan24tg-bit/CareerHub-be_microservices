"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const http_error_mapper_1 = require("./http-error.mapper");
const request_id_1 = require("../request-context/request-id");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        const request = context.getRequest();
        const httpException = (0, http_error_mapper_1.mapErrorToHttpException)(exception);
        const status = httpException.getStatus();
        const exceptionResponse = httpException.getResponse();
        const normalized = this.normalizeResponse(exceptionResponse, status);
        const requestId = (0, request_id_1.getRequestIdFromHttpRequest)(request);
        response.status(status).json({
            success: false,
            error: {
                code: normalized.code,
                details: normalized.details,
                message: normalized.message
            },
            statusCode: status,
            path: request.url,
            requestId,
            timestamp: new Date().toISOString()
        });
    }
    normalizeResponse(response, status) {
        if (typeof response === 'string') {
            return {
                code: this.defaultCode(status),
                message: response
            };
        }
        const body = response;
        const normalizedMessage = Array.isArray(body.message)
            ? 'Request validation failed'
            : body.message ?? 'Request failed';
        return {
            code: body.code ?? this.defaultCode(body.statusCode ?? status),
            details: body.details ?? (Array.isArray(body.message) ? body.message : undefined),
            message: normalizedMessage
        };
    }
    defaultCode(status) {
        if (status === common_1.HttpStatus.BAD_REQUEST) {
            return 'BAD_REQUEST';
        }
        if (status === common_1.HttpStatus.UNAUTHORIZED) {
            return 'UNAUTHORIZED';
        }
        if (status === common_1.HttpStatus.FORBIDDEN) {
            return 'FORBIDDEN';
        }
        if (status === common_1.HttpStatus.NOT_FOUND) {
            return 'NOT_FOUND';
        }
        if (status === common_1.HttpStatus.CONFLICT) {
            return 'CONFLICT';
        }
        return 'INTERNAL_SERVER_ERROR';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
