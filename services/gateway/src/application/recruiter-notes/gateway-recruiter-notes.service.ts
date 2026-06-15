import { Injectable } from '@nestjs/common';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import { IamGrpcClient } from '../../infrastructure/transport/grpc/iam-grpc.client';

export type GatewayHttpRecruiterNote = {
  applicationId: string;
  authorName: string | null;
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
};

@Injectable()
export class GatewayRecruiterNotesService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly iamGrpcClient: IamGrpcClient
  ) {}

  async listNotes(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }): Promise<GatewayHttpRecruiterNote[]> {
    const response = await this.applicationGrpcClient.listRecruiterNotes(
      {
        application_id: input.applicationId,
        employer_identity_id: input.identityId
      },
      input.requestId
    );

    return Promise.all(
      (response.items ?? []).map((note) => this.toHttpNote(note, input.requestId))
    );
  }

  async createNote(input: {
    applicationId: string;
    body: string;
    identityId: string;
    requestId?: string;
  }): Promise<GatewayHttpRecruiterNote> {
    const response = await this.applicationGrpcClient.createRecruiterNote(
      {
        application_id: input.applicationId,
        body: input.body,
        employer_identity_id: input.identityId
      },
      input.requestId
    );

    return this.toHttpNote(response.note, input.requestId);
  }

  async updateNote(input: {
    body: string;
    identityId: string;
    noteId: string;
    requestId?: string;
  }): Promise<GatewayHttpRecruiterNote> {
    const response = await this.applicationGrpcClient.updateRecruiterNote(
      {
        body: input.body,
        employer_identity_id: input.identityId,
        note_id: input.noteId
      },
      input.requestId
    );

    return this.toHttpNote(response.note, input.requestId);
  }

  async deleteNote(input: { identityId: string; noteId: string; requestId?: string }) {
    return this.applicationGrpcClient.deleteRecruiterNote(
      {
        employer_identity_id: input.identityId,
        note_id: input.noteId
      },
      input.requestId
    );
  }

  private async toHttpNote(
    note: {
      application_id: string;
      author_identity_id: string;
      body: string;
      created_at: string;
      id: string;
    },
    requestId?: string
  ): Promise<GatewayHttpRecruiterNote> {
    const authorName = await this.resolveAuthorName(note.author_identity_id, requestId);

    return {
      applicationId: note.application_id,
      authorName,
      authorUserId: note.author_identity_id,
      body: note.body,
      createdAt: note.created_at,
      id: note.id
    };
  }

  private async resolveAuthorName(
    identityId: string,
    requestId?: string
  ): Promise<string | null> {
    try {
      const response = await this.iamGrpcClient.getCurrentIdentity(
        { identity_id: identityId },
        requestId
      );

      return response.email;
    } catch {
      return null;
    }
  }
}
