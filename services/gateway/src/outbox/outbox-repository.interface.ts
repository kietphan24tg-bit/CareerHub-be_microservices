import type { OutboxRecord } from '@careerhub/contracts';

export interface OutboxRepository {
  save(record: OutboxRecord): Promise<void>;
}
