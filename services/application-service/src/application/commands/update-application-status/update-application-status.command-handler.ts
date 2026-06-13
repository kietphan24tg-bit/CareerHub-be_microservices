import type { ApplicationRecord } from '../../ports';
import { ApplicationOperations } from '../../services/application-operations.service';
import type { UpdateApplicationStatusCommand } from './update-application-status.command';

export class UpdateApplicationStatusCommandHandler {
  constructor(private readonly applicationOperations: ApplicationOperations) {}

  async execute(command: UpdateApplicationStatusCommand): Promise<ApplicationRecord> {
    return this.applicationOperations.updateEmployerStatus(command);
  }
}
