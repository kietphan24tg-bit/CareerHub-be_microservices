import { InterviewOperations } from '../../../services/interview-operations.service';
import type { CreateInterviewCommand } from './create-interview.command';

export class CreateInterviewCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: CreateInterviewCommand) {
    return this.interviewOperations.createInterview(
      command.employerIdentityId,
      command.applicationId,
      command
    );
  }
}
