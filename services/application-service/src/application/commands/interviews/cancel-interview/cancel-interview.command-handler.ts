import { InterviewOperations } from '../../../services/interview-operations.service';
import type { CancelInterviewCommand } from './cancel-interview.command';

export class CancelInterviewCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: CancelInterviewCommand) {
    return this.interviewOperations.cancelInterview(
      command.employerIdentityId,
      command.interviewId,
      { reason: command.reason }
    );
  }
}
