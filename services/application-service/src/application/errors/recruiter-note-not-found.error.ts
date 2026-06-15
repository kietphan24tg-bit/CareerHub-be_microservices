import { ApplicationError } from '@careerhub/infrastructure';

export class RecruiterNoteNotFoundError extends ApplicationError {
  constructor(noteId?: string) {
    super(
      noteId ? `Recruiter note not found: ${noteId}` : 'Recruiter note not found.',
      {
        code: 'RECRUITER_NOTE_NOT_FOUND'
      }
    );
  }
}
