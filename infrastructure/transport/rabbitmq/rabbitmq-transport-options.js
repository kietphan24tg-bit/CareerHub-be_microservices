"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitMqQueueName = getRabbitMqQueueName;
exports.getRabbitMqExchangeName = getRabbitMqExchangeName;
exports.getRabbitMqDeadLetterExchangeName = getRabbitMqDeadLetterExchangeName;
exports.getRabbitMqDeadLetterQueueName = getRabbitMqDeadLetterQueueName;
function prefixName(prefix, name) {
    return prefix.length > 0 ? `${prefix}${name}` : name;
}
function getRabbitMqQueueName(config, queue) {
    return prefixName(config.brokerQueuePrefix, queue);
}
function getRabbitMqExchangeName(config, exchange) {
    return prefixName(config.brokerExchangePrefix, exchange);
}
function getRabbitMqDeadLetterExchangeName(config, exchange) {
    return prefixName(config.brokerExchangePrefix, `${config.brokerDeadLetterPrefix}.${exchange}`);
}
function getRabbitMqDeadLetterQueueName(config, queue) {
    return prefixName(config.brokerQueuePrefix, `${config.brokerDeadLetterPrefix}.${queue}`);
}
