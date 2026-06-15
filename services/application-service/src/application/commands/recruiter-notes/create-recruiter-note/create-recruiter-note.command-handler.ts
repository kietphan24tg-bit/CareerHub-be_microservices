import { RecruiterNoteOperations } from '../../../services/recruiter-note-operations.service';
import type { CreateRecruiterNoteCommand } from './create-recruiter-note.command';

export class CreateRecruiterNoteCommandHandler {
  constructor(private readonly recruiterNoteOperations: RecruiterNoteOperations) {}

  execute(command: CreateRecruiterNoteCommand) {
    return this.recruiterNoteOperations.createNote(
      command.employerIdentityId,
      command.applicationId,
      command.body
    );
  }
}
