"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const request_id_1 = require("../../../runtime/request-context/request-id");
const http_error_mapper_1 = require("../../../runtime/http/http-error.mapper");
const logging_config_1 = require("../../logging/logging.config");
const runtime_logger_1 = require("../../logging/runtime-logger");
let HttpLoggingInterceptor = class HttpLoggingInterceptor {
    logger;
    metrics;
    runtimeConfig;
    constructor(logger, metrics, runtimeConfig) {
        this.logger = logger;
        this.metrics = metrics;
        this.runtimeConfig = runtimeConfig;
    }
    intercept(context, next) {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const startedAt = Date.now();
        const requestId = (0, request_id_1.getRequestIdFromHttpRequest)(request);
        const method = request.method;
        const path = request.originalUrl ?? request.url;
        const route = request.route?.path ?? request.path ?? path;
        const shouldLog = this.runtimeConfig?.httpLogEnabled !== false &&
            !(0, logging_config_1.shouldIgnoreHttpLog)(path, {
                healthPath: this.runtimeConfig?.healthPath,
                livenessPath: this.runtimeConfig?.healthLivenessPath,
                metricsPath: this.runtimeConfig?.metricsPath,
                readinessPath: this.runtimeConfig?.healthReadinessPath
            });
        const baseLogContext = {
            context: 'HttpLoggingInterceptor',
            method,
            path,
            requestId,
            userAgent: typeof request.headers['user-agent'] === 'string'
                ? request.headers['user-agent']
                : Array.isArray(request.headers['user-agent'])
                    ? request.headers['user-agent'][0]
                    : undefined
        };
        if (shouldLog) {
            this.logger.logHttpRequestStart(baseLogContext);
        }
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            const latencyMs = Date.now() - startedAt;
            const statusCode = response.statusCode;
            this.metrics?.recordHttpRequest({
                durationMs: latencyMs,
                method,
                route,
                statusCode
            });
            if (shouldLog) {
                this.logger.logHttpRequestComplete({
                    ...baseLogContext,
                    latencyMs,
                    statusCode
                });
            }
        }), (0, rxjs_1.catchError)((error) => {
            const latencyMs = Date.now() - startedAt;
            const statusCode = (0, http_error_mapper_1.mapErrorToHttpException)(error).getStatus();
            this.metrics?.recordHttpRequest({
                durationMs: latencyMs,
                method,
                route,
                statusCode
            });
            this.metrics?.recordHttpError({
                method,
                route,
                statusCode
            });
            if (shouldLog) {
                this.logger.logHttpRequestError({
                    ...baseLogContext,
                    error,
                    latencyMs,
                    statusCode
                });
            }
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
};
exports.HttpLoggingInterceptor = HttpLoggingInterceptor;
exports.HttpLoggingInterceptor = HttpLoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [runtime_logger_1.RuntimeLogger, Object, Object])
], HttpLoggingInterceptor);
