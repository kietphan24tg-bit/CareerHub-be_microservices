import { UniqueEntityID } from './unique-entities';
export interface BaseEntityProps {
    id: UniqueEntityID;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}
export interface CreateEntityProps<T> extends BaseEntityProps {
    props: T;
}
export declare abstract class Entity<Props> {
    #private;
    constructor({ id, props, createdAt, updatedAt }: CreateEntityProps<Props>);
    static isEntity(entity: unknown): entity is Entity<unknown>;
    get id(): UniqueEntityID;
    get createdAt(): Date | null;
    get updatedAt(): Date | null;
    getProps(): Props & BaseEntityProps;
    /**
     * Convert an Entity and all sub-entities/Value Objects it
     * contains to a plain object with primitive types. Can be
     * useful when logging an entity during testing/debugging
     */
    toObject(): Readonly<Props & {
        id: UniqueEntityID;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    /**
     * Each entity must have some validate/business rules
     * This method is called every time before save this entity to the database
     */
    abstract validate(): void;
}
