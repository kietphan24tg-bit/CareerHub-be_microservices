"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRoot = void 0;
const entities_1 = require("./entities");
class AggregateRoot extends entities_1.Entity {
    #domainEvents = [];
    get domainEvents() {
        return [...this.#domainEvents];
    }
    addDomainEvent(domainEvent) {
        if (Array.isArray(domainEvent)) {
            this.#domainEvents.push(...domainEvent);
        }
        else {
            this.#domainEvents.push(domainEvent);
        }
    }
    clearDomainEvents() {
        this.#domainEvents = [];
    }
    pullDomainEvents() {
        const events = [...this.#domainEvents];
        this.clearDomainEvents();
        return events;
    }
}
exports.AggregateRoot = AggregateRoot;
