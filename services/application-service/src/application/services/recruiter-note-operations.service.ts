import { ApplicationError } from '@careerhub/infrastructure';
import type { ApplicationRepository } from '../ports/application-repository.port';
import type { IdGenerator } from '../ports/id-generator.port';
import type { RecruiterNoteRecord } from '../ports/employer-dashboard.port';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { RecruiterNoteNotFoundError } from '../errors/recruiter-note-not-found.error';
import { RECRUITER_NOTE_BODY_MAX_LENGTH } from './employer-dashboard.constants';

export class InvalidRecruiterNoteBodyError extends ApplicationError {
  constructor(message = 'Recruiter note body is invalid.') {
    super(message, {
      code: 'INVALID_RECRUITER_NOTE_BODY'
    });
  }
}

function normalizeRecruiterNoteBody(body: string): string {
  const normalized = body.trim();

  if (!normalized) {
    throw new InvalidRecruiterNoteBodyError('Recruiter note body must not be empty.');
  }

  if (normalized.length > RECRUITER_NOTE_BODY_MAX_LENGTH) {
    throw new InvalidRecruiterNoteBodyError(
      `Recruiter note body must be at most ${RECRUITER_NOTE_BODY_MAX_LENGTH} characters.`
    );
  }

  return normalized;
}

export class RecruiterNoteOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async listNotes(
    employerIdentityId: string,
    applicationId: string
  ): Promise<RecruiterNoteRecord[]> {
    await this.ensureEmployerOwnsApplication(employerIdentityId, applicationId);
    return this.applicationRepository.listRecruiterNotesByApplication(applicationId.trim());
  }

  async createNote(
    employerIdentityId: string,
    applicationId: string,
    body: string
  ): Promise<RecruiterNoteRecord> {
    await this.ensureEmployerOwnsApplication(employerIdentityId, applicationId);

    return this.applicationRepository.createRecruiterNote({
      applicationId: applicationId.trim(),
      authorIdentityId: employerIdentityId.trim(),
      body: normalizeRecruiterNoteBody(body),
      id: this.idGenerator.generate()
    });
  }

  async updateNote(
    employerIdentityId: string,
    noteId: string,
    body: string
  ): Promise<RecruiterNoteRecord> {
    const note = await this.ensureEmployerOwnsNote(employerIdentityId, noteId);
    const updated = await this.applicationRepository.updateRecruiterNote(
      note.id,
      normalizeRecruiterNoteBody(body)
    );

    if (!updated) {
      throw new RecruiterNoteNotFoundError(noteId);
    }

    return updated;
  }

  async deleteNote(employerIdentityId: string, noteId: string): Promise<{ deleted: true; id: string }> {
    const note = await this.ensureEmployerOwnsNote(employerIdentityId, noteId);
    const deleted = await this.applicationRepository.deleteRecruiterNote(note.id);

    if (!deleted) {
      throw new RecruiterNoteNotFoundError(noteId);
    }

    return {
      deleted: true,
      id: note.id
    };
  }

  private async ensureEmployerOwnsApplication(
    employerIdentityId: string,
    applicationId: string
  ) {
    const application = await this.applicationRepository.findByIdAndEmployer(
      applicationId.trim(),
      employerIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    return application;
  }

  private async ensureEmployerOwnsNote(employerIdentityId: string, noteId: string) {
    const note = await this.applicationRepository.findRecruiterNoteById(noteId.trim());

    if (!note) {
      throw new RecruiterNoteNotFoundError(noteId);
    }

    await this.ensureEmployerOwnsApplication(employerIdentityId, note.applicationId);
    return note;
  }
}
