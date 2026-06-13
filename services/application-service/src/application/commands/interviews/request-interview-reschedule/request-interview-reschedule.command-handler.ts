import { InterviewOperations } from '../../../services/interview-operations.service';
import type { RequestInterviewRescheduleCommand } from './request-interview-reschedule.command';

export class RequestInterviewRescheduleCommandHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(command: RequestInterviewRescheduleCommand) {
    return this.interviewOperations.requestReschedule(
      command.candidateIdentityId,
      command.interviewId,
      command
    );
  }
}
