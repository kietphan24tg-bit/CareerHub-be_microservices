import type { RegisterCandidateCommand } from './register-candidate.command';
import type { RegisterCandidateResult } from './register-candidate.result';
import { RegistrationSagaOrchestrator } from '../../saga/registration-saga.orchestrator';

export class RegisterCandidateCommandHandler {
  constructor(
    private readonly registrationSagaOrchestrator: RegistrationSagaOrchestrator
  ) {}

  async execute(
    command: RegisterCandidateCommand
  ): Promise<RegisterCandidateResult> {
    return this.registrationSagaOrchestrator.registerCandidate(command);
  }
}
