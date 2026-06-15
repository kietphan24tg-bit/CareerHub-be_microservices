import { RecruiterNoteOperations } from '../../../services/recruiter-note-operations.service';
import type { UpdateRecruiterNoteCommand } from './update-recruiter-note.command';

export class UpdateRecruiterNoteCommandHandler {
  constructor(private readonly recruiterNoteOperations: RecruiterNoteOperations) {}

  execute(command: UpdateRecruiterNoteCommand) {
    return this.recruiterNoteOperations.updateNote(
      command.employerIdentityId,
      command.noteId,
      command.body
    );
  }
}
