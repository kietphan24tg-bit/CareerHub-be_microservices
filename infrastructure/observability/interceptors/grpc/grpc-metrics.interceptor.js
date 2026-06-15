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
exports.GrpcMetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
function resolveRpcPattern(context) {
    const className = context.getClass().name || 'UnknownController';
    const handlerName = context.getHandler().name || 'unknown';
    return `${className}.${handlerName}`;
}
let GrpcMetricsInterceptor = class GrpcMetricsInterceptor {
    metrics;
    constructor(metrics) {
        this.metrics = metrics;
    }
    intercept(context, next) {
        if (context.getType() !== 'rpc') {
            return next.handle();
        }
        const startedAt = Date.now();
        const pattern = resolveRpcPattern(context);
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.metrics?.recordRpcRequest({
                durationMs: Date.now() - startedAt,
                pattern,
                status: 'success'
            });
        }), (0, rxjs_1.catchError)((error) => {
            const durationMs = Date.now() - startedAt;
            this.metrics?.recordRpcRequest({
                durationMs,
                pattern,
                status: 'error'
            });
            this.metrics?.recordRpcError({
                durationMs,
                pattern,
                status: 'error'
            });
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
};
exports.GrpcMetricsInterceptor = GrpcMetricsInterceptor;
exports.GrpcMetricsInterceptor = GrpcMetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], GrpcMetricsInterceptor);
