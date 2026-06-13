import { InterviewOperations } from '../../../services/interview-operations.service';
import type { ConfirmInterviewCommand } from './confirm-interview.command';

export class ConfirmInterviewCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: ConfirmInterviewCommand) {
    return this.interviewOperations.confirmInterview(
      command.candidateIdentityId,
      command.interviewId,
      command
    );
  }
}
