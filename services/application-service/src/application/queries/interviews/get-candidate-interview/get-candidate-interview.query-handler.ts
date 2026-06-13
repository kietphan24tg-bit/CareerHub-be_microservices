import { InterviewOperations } from '../../../services/interview-operations.service';
import type { GetCandidateInterviewQuery } from './get-candidate-interview.query';

export class GetCandidateInterviewQueryHandler {
  constructor(private readonly interviewOperations: InterviewOperations) {}

  execute(query: GetCandidateInterviewQuery) {
    return this.interviewOperations.getCandidateInterview(
      query.candidateIdentityId,
      query.applicationId
    );
  }
}
