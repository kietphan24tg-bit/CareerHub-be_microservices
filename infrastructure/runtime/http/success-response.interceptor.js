"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
let SuccessResponseInterceptor = class SuccessResponseInterceptor {
    intercept(context, next) {
        if (context.getType() !== 'http') {
            return next.handle().pipe((0, rxjs_1.map)((data) => this.mapResponse(data)));
        }
        return next.handle().pipe((0, rxjs_1.map)((data) => this.mapResponse(data)));
    }
    mapResponse(data) {
        if (data instanceof common_1.StreamableFile) {
            return data;
        }
        return this.wrapResponse(data);
    }
    wrapResponse(data) {
        if (isObject(data) && data.success === true) {
            return data;
        }
        if (isObject(data)) {
            const maybeEnvelope = data;
            if ('data' in maybeEnvelope || 'message' in maybeEnvelope) {
                return {
                    success: true,
                    data: (maybeEnvelope.data ?? data),
                    message: maybeEnvelope.message ?? 'Operation successful'
                };
            }
        }
        return {
            success: true,
            data,
            message: 'Operation successful'
        };
    }
};
exports.SuccessResponseInterceptor = SuccessResponseInterceptor;
exports.SuccessResponseInterceptor = SuccessResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], SuccessResponseInterceptor);
