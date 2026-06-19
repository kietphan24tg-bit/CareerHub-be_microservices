import assert from 'node:assert/strict';
import test from 'node:test';
import { EmployerRecruiterNotesController } from '../recruiter-notes/employer-recruiter-notes.controller';

const BASE_NOTE = {
  applicationId: 'app-1',
  authorName: 'Jane Recruiter',
  authorUserId: 'employer-1',
  body: 'Strong candidate with good communication skills',
  createdAt: '2026-06-01T10:00:00.000Z',
  id: 'note-1'
};

const USER = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };

test('listApplicationNotes returns notes for the given application', async () => {
  const controller = new EmployerRecruiterNotesController({
    async listNotes(input: { applicationId: string; identityId: string }) {
      assert.equal(input.applicationId, 'app-1');
      assert.equal(input.identityId, 'employer-1');
      return [BASE_NOTE];
    },
    async createNote() {
      throw new Error('unused');
    },
    async updateNote() {
      throw new Error('unused');
    },
    async deleteNote() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.listApplicationNotes(USER, 'app-1', 'req-1');

  assert.equal(response.data.length, 1);
  assert.equal(response.data[0]?.id, 'note-1');
  assert.equal(response.data[0]?.applicationId, 'app-1');
  assert.equal(response.message, 'Recruiter notes loaded successfully');
});

test('listApplicationNotes returns empty array when no notes', async () => {
  const controller = new EmployerRecruiterNotesController({
    async listNotes() {
      return [];
    },
    async createNote() {
      throw new Error('unused');
    },
    async updateNote() {
      throw new Error('unused');
    },
    async deleteNote() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.listApplicationNotes(USER, 'app-1', 'req-1');

  assert.equal(response.data.length, 0);
});

test('createApplicationNote returns new note with given body', async () => {
  const controller = new EmployerRecruiterNotesController({
    async listNotes() {
      throw new Error('unused');
    },
    async createNote(input: {
      applicationId: string;
      body: string;
      identityId: string;
    }) {
      assert.equal(input.applicationId, 'app-1');
      assert.equal(input.body, 'Strong candidate');
      assert.equal(input.identityId, 'employer-1');
      return { ...BASE_NOTE, body: input.body };
    },
    async updateNote() {
      throw new Error('unused');
    },
    async deleteNote() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.createApplicationNote(
    USER,
    'app-1',
    { body: 'Strong candidate' } as never,
    'req-1'
  );

  assert.equal(response.data.body, 'Strong candidate');
  assert.equal(response.data.applicationId, 'app-1');
  assert.equal(response.message, 'Recruiter note created successfully');
});

test('updateRecruiterNote returns note with updated body', async () => {
  const controller = new EmployerRecruiterNotesController({
    async listNotes() {
      throw new Error('unused');
    },
    async createNote() {
      throw new Error('unused');
    },
    async updateNote(input: { body: string; noteId: string }) {
      assert.equal(input.noteId, 'note-1');
      assert.equal(input.body, 'Updated note body');
      return { ...BASE_NOTE, body: input.body };
    },
    async deleteNote() {
      throw new Error('unused');
    }
  } as never);

  const response = await controller.updateRecruiterNote(
    USER,
    'note-1',
    { body: 'Updated note body' } as never,
    'req-1'
  );

  assert.equal(response.data.body, 'Updated note body');
  assert.equal(response.message, 'Recruiter note updated successfully');
});

test('deleteRecruiterNote returns deleted confirmation', async () => {
  const controller = new EmployerRecruiterNotesController({
    async listNotes() {
      throw new Error('unused');
    },
    async createNote() {
      throw new Error('unused');
    },
    async updateNote() {
      throw new Error('unused');
    },
    async deleteNote(input: { identityId: string; noteId: string }) {
      assert.equal(input.noteId, 'note-1');
      assert.equal(input.identityId, 'employer-1');
      return { deleted: true, id: 'note-1' };
    }
  } as never);

  const response = await controller.deleteRecruiterNote(USER, 'note-1', 'req-1');

  assert.equal(response.data.deleted, true);
  assert.equal(response.data.id, 'note-1');
  assert.equal(response.message, 'Recruiter note deleted successfully');
});
