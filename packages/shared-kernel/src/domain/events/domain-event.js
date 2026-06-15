"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainEvent = void 0;
const validation_error_1 = require("../errors/validation-error");
class DomainEvent {
    aggregateId;
    metadata;
    constructor(props) {
        if (!props) {
            throw new validation_error_1.ValidationError('Domain event props are required');
        }
        if (!props.aggregateId) {
            throw new validation_error_1.ValidationError('Domain event aggregate id is required');
        }
        this.aggregateId = props.aggregateId;
        this.metadata = {
            correlationId: props.metadata?.correlationId,
            causationId: props.metadata?.causationId,
            timestamp: props.metadata?.timestamp ?? Date.now(),
            userId: props.metadata?.userId
        };
    }
}
exports.DomainEvent = DomainEvent;
