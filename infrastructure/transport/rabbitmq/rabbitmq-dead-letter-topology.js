"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitMqParkingDeadLetterTopology = getRabbitMqParkingDeadLetterTopology;
exports.assertRabbitMqParkingDeadLetterTopology = assertRabbitMqParkingDeadLetterTopology;
const rabbitmq_transport_options_1 = require("./rabbitmq-transport-options");
function getRabbitMqParkingDeadLetterTopology(config, exchange, queue) {
    const resolvedExchange = (0, rabbitmq_transport_options_1.getRabbitMqExchangeName)(config, exchange);
    const resolvedQueue = (0, rabbitmq_transport_options_1.getRabbitMqQueueName)(config, queue);
    const deadLetterQueue = (0, rabbitmq_transport_options_1.getRabbitMqDeadLetterQueueName)(config, queue);
    return {
        deadLetterExchange: (0, rabbitmq_transport_options_1.getRabbitMqDeadLetterExchangeName)(config, exchange),
        deadLetterQueue,
        deadLetterRoutingKey: deadLetterQueue,
        exchange: resolvedExchange,
        queue: resolvedQueue
    };
}
async function assertRabbitMqParkingDeadLetterTopology(channel, config, exchange, queue) {
    const topology = getRabbitMqParkingDeadLetterTopology(config, exchange, queue);
    await channel.assertExchange(topology.exchange, 'topic', {
        durable: config.brokerDurable
    });
    if (config.brokerDeadLetterEnabled) {
        await channel.assertExchange(topology.deadLetterExchange, 'topic', {
            durable: config.brokerDurable
        });
        await channel.assertQueue(topology.deadLetterQueue, {
            durable: config.brokerDurable
        });
        await channel.bindQueue(topology.deadLetterQueue, topology.deadLetterExchange, topology.deadLetterRoutingKey);
        await channel.assertQueue(topology.queue, {
            durable: config.brokerDurable,
            arguments: {
                'x-dead-letter-exchange': topology.deadLetterExchange,
                'x-dead-letter-routing-key': topology.deadLetterRoutingKey
            }
        });
    }
    else {
        await channel.assertQueue(topology.queue, {
            durable: config.brokerDurable
        });
    }
    return topology;
}
