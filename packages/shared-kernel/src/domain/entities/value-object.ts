import { convertPropsToObject } from '../../helpers/object';
import { ValidationError } from '../errors/validation-error';

/**
 * Domain Primitive is an object that contains only a single value
 */
export type Primitives = string | number | boolean;
export interface DomainPrimitive<T extends Primitives | Date> {
    value: T;
}

type ValueObjectProps<T> = T extends Primitives | Date ? DomainPrimitive<T> : T;

export abstract class ValueObject<Props> {
    protected readonly props: ValueObjectProps<Props>;

    constructor(props: ValueObjectProps<Props>) {
        this.#validateProps(props);
        this.validate(props);
        this.props = props;
    }

    protected abstract validate(props: ValueObjectProps<Props>): void;
    static isValueObject(obj: unknown): obj is ValueObject<unknown> {
        return obj instanceof ValueObject;
    }

    equals(vo?: ValueObject<Props>): boolean {
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
        const clone = convertPropsToObject(this.props);
        return Object.freeze(clone);
    }

    #validateProps(props: ValueObjectProps<Props>) {
        if (props === null || props === undefined) {
            throw new ValidationError('Value object props are required');
        }

        if (
            this.#isDomainPrimitive(props) &&
            (props.value === null || props.value === undefined || props.value === '')
        ) {
            throw new ValidationError(
                'Value object primitive value is required'
            );
        }
    }

    #isDomainPrimitive(
        obj: unknown
    ): obj is DomainPrimitive<Props & (Primitives | Date)> {
        if (Object.prototype.hasOwnProperty.call(obj, 'value')) return true;
        return false;
    }
}
