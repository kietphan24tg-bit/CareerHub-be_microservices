export type RabbitMqPublishContext = {
    aggregate: string;
    service: string;
};

export type RabbitMqGatewayMessagingConfig = {
    exchange: string;
    prefetch: number;
    url?: string;
};
