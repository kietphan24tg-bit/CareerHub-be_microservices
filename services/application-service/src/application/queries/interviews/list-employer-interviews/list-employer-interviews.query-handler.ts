import { InterviewOperations } from '../../../services/interview-operations.service';
import type { ListEmployerInterviewsQuery } from './list-employer-interviews.query';

export class ListEmployerInterviewsQueryHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(query: ListEmployerInterviewsQuery) {
    return this.interviewOperations.listEmployerInterviewsPage(query);
  }
}
