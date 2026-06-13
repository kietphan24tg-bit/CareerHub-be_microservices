import type { ApplicationRecord } from '../../ports';
import { ApplicationOperations } from '../../services/application-operations.service';
import type { ApplyToJobCommand } from './apply-to-job.command';

export class ApplyToJobCommandHandler {
  constructor(private readonly applicationOperations: ApplicationOperations) {}

  async execute(command: ApplyToJobCommand): Promise<ApplicationRecord> {
    return this.applicationOperations.applyToJob(command);
  }
}
