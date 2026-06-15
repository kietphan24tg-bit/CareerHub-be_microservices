import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayRecruiterNotesService } from './gateway-recruiter-notes.service';

const baseNote = {
  application_id: 'application-1',
  author_identity_id: 'employer-identity-1',
  body: 'Strong communication skills.',
  created_at: '2026-06-12T00:00:00.000Z',
  id: 'note-1'
};

function createService(input?: { email?: string; iamLookupFails?: boolean }) {
  return new GatewayRecruiterNotesService(
    {
      async listRecruiterNotes() {
        return { items: [baseNote] };
      },
      async createRecruiterNote() {
        return { note: baseNote };
      },
      async updateRecruiterNote() {
        return { note: { ...baseNote, body: 'Updated note body.' } };
      },
      async deleteRecruiterNote() {
        return { deleted: true, id: baseNote.id };
      }
    } as never,
    {
      async getCurrentIdentity() {
        if (input?.iamLookupFails) {
          throw new Error('IAM unavailable');
        }

        return { email: input?.email ?? 'recruiter@example.com' };
      }
    } as never
  );
}

test('listNotes maps monolith-compatible recruiter note shape with authorUserId and email authorName', async () => {
  const service = createService({ email: 'recruiter@example.com' });
  const notes = await service.listNotes({
    applicationId: 'application-1',
    identityId: 'employer-identity-1'
  });

  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.authorUserId, 'employer-identity-1');
  assert.equal(notes[0]?.authorName, 'recruiter@example.com');
  assert.equal(notes[0]?.applicationId, 'application-1');
});

test('createNote returns authorName null when IAM lookup fails', async () => {
  const service = createService({ iamLookupFails: true });
  const note = await service.createNote({
    applicationId: 'application-1',
    body: 'Updated note body.',
    identityId: 'employer-identity-1'
  });

  assert.equal(note.authorUserId, 'employer-identity-1');
  assert.equal(note.authorName, null);
});

test('updateNote keeps authorUserId while resolving authorName from IAM', async () => {
  const service = createService({ email: 'updated@example.com' });
  const note = await service.updateNote({
    body: 'Updated note body.',
    identityId: 'employer-identity-1',
    noteId: 'note-1'
  });

  assert.equal(note.authorUserId, 'employer-identity-1');
  assert.equal(note.authorName, 'updated@example.com');
  assert.equal(note.body, 'Updated note body.');
});
