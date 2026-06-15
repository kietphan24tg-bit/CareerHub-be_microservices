"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueObject = void 0;
const object_1 = require("../../helpers/object");
const validation_error_1 = require("../errors/validation-error");
class ValueObject {
    props;
    constructor(props) {
        this.#validateProps(props);
        this.validate(props);
        this.props = props;
    }
    static isValueObject(obj) {
        return obj instanceof ValueObject;
    }
    equals(vo) {
        if (!vo) {
            return false;
        }
        return JSON.stringify(this.raw()) === JSON.stringify(vo.raw());
    }
    /**
     * Convert value obj to get raw properties
     */
    raw() {
        if (this.#isDomainPrimitive(this.props)) {
            return this.props.value;
        }
        const clone = (0, object_1.convertPropsToObject)(this.props);
        return Object.freeze(clone);
    }
    #validateProps(props) {
        if (props === null || props === undefined) {
            throw new validation_error_1.ValidationError('Value object props are required');
        }
        if (this.#isDomainPrimitive(props) &&
            (props.value === null || props.value === undefined || props.value === '')) {
            throw new validation_error_1.ValidationError('Value object primitive value is required');
        }
    }
    #isDomainPrimitive(obj) {
        if (Object.prototype.hasOwnProperty.call(obj, 'value'))
            return true;
        return false;
    }
}
exports.ValueObject = ValueObject;
