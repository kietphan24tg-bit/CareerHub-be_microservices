import { ValidationError } from '../errors/validation-error';

export class UniqueEntityID {
    readonly #value: string;

    constructor(id: string) {
        if (!id) {
            throw new ValidationError('Entity id is required');
        }

        this.#value = id;
    }

    equals(other?: UniqueEntityID): boolean {
        return !!other && other.toValue() === this.#value;
    }

    toString(): string {
        return this.#value;
    }

    toValue(): string { 
        return this.#value;
    }
}
