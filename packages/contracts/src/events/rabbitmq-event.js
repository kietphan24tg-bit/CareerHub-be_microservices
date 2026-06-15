"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntegrationEvent = createIntegrationEvent;
exports.toRabbitMqRoutingKey = toRabbitMqRoutingKey;
function createIntegrationEvent(name, payload, requestId) {
    return {
        name,
        occurredAt: new Date().toISOString(),
        payload,
        requestId,
        version: 1
    };
}
function toRabbitMqRoutingKey(eventName) {
    return eventName;
}
