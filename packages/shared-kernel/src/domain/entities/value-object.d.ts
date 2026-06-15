/**
 * Domain Primitive is an object that contains only a single value
 */
export type Primitives = string | number | boolean;
export interface DomainPrimitive<T extends Primitives | Date> {
    value: T;
}
type ValueObjectProps<T> = T extends Primitives | Date ? DomainPrimitive<T> : T;
export declare abstract class ValueObject<Props> {
    #private;
    protected readonly props: ValueObjectProps<Props>;
    constructor(props: ValueObjectProps<Props>);
    protected abstract validate(props: ValueObjectProps<Props>): void;
    static isValueObject(obj: unknown): obj is ValueObject<unknown>;
    equals(vo?: ValueObject<Props>): boolean;
    /**
     * Convert value obj to get raw properties
     */
    raw(): (Props & (Date | Primitives)) | Readonly<ValueObjectProps<Props>>;
}
export {};
