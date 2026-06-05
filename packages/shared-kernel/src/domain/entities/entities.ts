import { convertPropsToObject } from '../../helpers/object';
import { ValidationError } from '../errors/validation-error';
import { UniqueEntityID } from './unique-entities';

export interface BaseEntityProps {
    id: UniqueEntityID;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface CreateEntityProps<T> extends BaseEntityProps {
    props: T;
}

export abstract class Entity<Props> {
    #id: UniqueEntityID;
    readonly #createdAt: Date | null;
    readonly #props: Props;
    #updatedAt: Date | null;

    constructor({ id, props, createdAt, updatedAt }: CreateEntityProps<Props>) {
        this.#validateId(id);
        this.#validateProps(props);
        this.#id = id;
        this.#createdAt = createdAt ?? null;
        this.#updatedAt = updatedAt ?? null;
        this.#props = props;
        this.validate();
    }

    static isEntity(entity: unknown): entity is Entity<unknown> {
        return entity instanceof Entity;
    }

    get id(): UniqueEntityID {
        return this.#id;
    }

    get createdAt(): Date | null {
        return this.#createdAt;
    }

    get updatedAt(): Date | null {
        return this.#updatedAt;
    }

    getProps(): Props & BaseEntityProps {
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
        const clone = convertPropsToObject(this.getProps());

        const result = {
            ...clone,
            id: this.id,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt
        };
        return Object.freeze(result);
    }
    /**
     * Each entity must have some validate/business rules
     * This method is called every time before save this entity to the database
     */
    abstract validate(): void;

    #validateId(id: UniqueEntityID) {
        if (!id) {
            throw new ValidationError('Entity id is required');
        }
    }

    #validateProps(props: Props) {
        if (props === null || props === undefined) {
            throw new ValidationError('Entity props are required');
        }

        if (typeof props !== 'object') {
            throw new ValidationError('Entity props must be an object');
        }
    }
}
