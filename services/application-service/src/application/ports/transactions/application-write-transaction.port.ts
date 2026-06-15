import type { ApplicationRepository } from '../application-repository.port';
import type { OutboxRepository } from '../outbox/outbox-repository.port';
import type { RecruitmentRepository } from '../recruitment-repository.port';

export type ApplicationWriteTransactionContext = {
  applicationRepository: ApplicationRepository;
  outboxRepository: OutboxRepository;
  recruitmentRepository: RecruitmentRepository;
};

export interface ApplicationWriteTransaction {
  execute<T>(
    work: (context: ApplicationWriteTransactionContext) => Promise<T>
  ): Promise<T>;
}
