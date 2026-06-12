import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../../application';

export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
