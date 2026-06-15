import { RecruiterNoteOperations } from '../../../services/recruiter-note-operations.service';
import type { DeleteRecruiterNoteCommand } from './delete-recruiter-note.command';

export class DeleteRecruiterNoteCommandHandler {
  constructor(private readonly recruiterNoteOperations: RecruiterNoteOperations) {}

  execute(command: DeleteRecruiterNoteCommand) {
    return this.recruiterNoteOperations.deleteNote(
      command.employerIdentityId,
      command.noteId
    );
  }
}
