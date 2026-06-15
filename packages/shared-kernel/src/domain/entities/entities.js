"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
const object_1 = require("../../helpers/object");
const validation_error_1 = require("../errors/validation-error");
class Entity {
    #id;
    #createdAt;
    #props;
    #updatedAt;
    constructor({ id, props, createdAt, updatedAt }) {
        this.#validateId(id);
        this.#validateProps(props);
        this.#id = id;
        this.#createdAt = createdAt ?? null;
        this.#updatedAt = updatedAt ?? null;
        this.#props = props;
        this.validate();
    }
    static isEntity(entity) {
        return entity instanceof Entity;
    }
    get id() {
        return this.#id;
    }
    get createdAt() {
        return this.#createdAt;
    }
    get updatedAt() {
        return this.#updatedAt;
    }
    getProps() {
        const clone = {
            ...this.#props,
            id: this.id,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt
        };
        return Object.freeze(clone);
    }
    /**
     * Convert an Entity and all sub-entities/Value Objects it
     * contains to a plain object with primitive types. Can be
     * useful when logging an entity during testing/debugging
     */
    toObject() {
        const clone = (0, object_1.convertPropsToObject)(this.getProps());
        const result = {
            ...clone,
            id: this.id,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt
        };
        return Object.freeze(result);
    }
    #validateId(id) {
        if (!id) {
            throw new validation_error_1.ValidationError('Entity id is required');
        }
    }
    #validateProps(props) {
        if (props === null || props === undefined) {
            throw new validation_error_1.ValidationError('Entity props are required');
        }
        if (typeof props !== 'object') {
            throw new validation_error_1.ValidationError('Entity props must be an object');
        }
    }
}
exports.Entity = Entity;
