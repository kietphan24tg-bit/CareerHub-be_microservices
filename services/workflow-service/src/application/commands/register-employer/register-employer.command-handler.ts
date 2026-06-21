import type { RegisterEmployerCommand } from './register-employer.command';
import type { RegisterEmployerResult } from './register-employer.result';
import { RegistrationSagaOrchestrator } from '../../saga/registration-saga.orchestrator';

export class RegisterEmployerCommandHandler {
  constructor(
    private readonly registrationSagaOrchestrator: RegistrationSagaOrchestrator
  ) {}

  async execute(
    command: RegisterEmployerCommand
  ): Promise<RegisterEmployerResult> {
    return this.registrationSagaOrchestrator.registerEmployer(command);
  }
}
