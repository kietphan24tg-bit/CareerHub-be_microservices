import { InterviewOperations } from '../../../services/interview-operations.service';
import type { UpdateInterviewCommand } from './update-interview.command';

export class UpdateInterviewCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: UpdateInterviewCommand) {
    return this.interviewOperations.updateInterview(
      command.employerIdentityId,
      command.interviewId,
      command
    );
  }
}
