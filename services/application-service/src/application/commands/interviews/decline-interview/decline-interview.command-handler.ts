import { InterviewOperations } from '../../../services/interview-operations.service';
import type { DeclineInterviewCommand } from './decline-interview.command';

export class DeclineInterviewCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: DeclineInterviewCommand) {
    return this.interviewOperations.declineInterview(
      command.candidateIdentityId,
      command.interviewId,
      command
    );
  }
}
