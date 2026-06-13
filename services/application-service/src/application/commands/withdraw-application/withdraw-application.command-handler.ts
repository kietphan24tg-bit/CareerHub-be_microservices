import type { ApplicationRecord } from '../../ports';
import { ApplicationOperations } from '../../services/application-operations.service';
import type { WithdrawApplicationCommand } from './withdraw-application.command';

export class WithdrawApplicationCommandHandler {
  constructor(private readonly applicationOperations: ApplicationOperations) {}

  async execute(command: WithdrawApplicationCommand): Promise<ApplicationRecord> {
    return this.applicationOperations.withdrawApplication(command);
  }
}
