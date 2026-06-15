import { RecruiterNoteOperations } from '../../services/recruiter-note-operations.service';
import type { ListRecruiterNotesQuery } from './list-recruiter-notes.query';

export class ListRecruiterNotesQueryHandler {
  constructor(private readonly recruiterNoteOperations: RecruiterNoteOperations) {}

  execute(query: ListRecruiterNotesQuery) {
    return this.recruiterNoteOperations.listNotes(
      query.employerIdentityId,
      query.applicationId
    );
  }
}
