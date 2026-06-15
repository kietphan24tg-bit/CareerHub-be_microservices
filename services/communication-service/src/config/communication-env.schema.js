"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommunicationEnvironment = validateCommunicationEnvironment;
var infrastructure_1 = require("@careerhub/infrastructure");
function validateCommunicationEnvironment(config) {
    var baseEnvironment = (0, infrastructure_1.validateEnvironment)(config);
    var grpcCommunicationUrl = typeof config.GRPC_COMMUNICATION_URL === 'string' &&
        config.GRPC_COMMUNICATION_URL.trim().length > 0
        ? config.GRPC_COMMUNICATION_URL.trim()
        : '0.0.0.0:50056';
    return __assign(__assign({}, baseEnvironment), { GRPC_COMMUNICATION_URL: grpcCommunicationUrl });
}
