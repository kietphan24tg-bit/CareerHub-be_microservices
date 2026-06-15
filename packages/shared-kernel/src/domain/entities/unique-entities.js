"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueEntityID = void 0;
const validation_error_1 = require("../errors/validation-error");
class UniqueEntityID {
    #value;
    constructor(id) {
        if (!id) {
            throw new validation_error_1.ValidationError('Entity id is required');
        }
        this.#value = id;
    }
    equals(other) {
        return !!other && other.toValue() === this.#value;
    }
    toString() {
        return this.#value;
    }
    toValue() {
        return this.#value;
    }
}
exports.UniqueEntityID = UniqueEntityID;
