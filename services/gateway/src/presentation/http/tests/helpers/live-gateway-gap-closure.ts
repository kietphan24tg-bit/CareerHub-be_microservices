import assert from 'node:assert/strict';
import { requestJson } from './live-http';
import type { ErrorEnvelope, SuccessEnvelope } from './live-types';

export type GatewayNotification = {
  createdAt: string;
  id: string;
  identityId: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  title: string;
  type: string;
};

export type GatewayRecruiterNote = {
  applicationId: string;
  authorName: string | null;
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
};

export type EmployerDashboardResponse = {
  interviewsToday: Array<Record<string, unknown>>;
  pipeline: Array<Record<string, unknown>>;
  priorityJobs: Array<Record<string, unknown>>;
  recentActivities: Array<Record<string, unknown>>;
  summary: {
    activeJobs: number;
    interviewsToday: number;
    offersOpen: number;
    totalApplicants: number;
  };
};

export async function getEmployerDashboard(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<EmployerDashboardResponse>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<EmployerDashboardResponse>
  >('/employer/dashboard', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function listRecruiterNotes(input: {
  accessToken: string;
  applicationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayRecruiterNote[]>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayRecruiterNote[]>>(
    `/employer/applications/${input.applicationId}/notes`,
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'GET'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function createRecruiterNote(input: {
  accessToken: string;
  applicationId: string;
  body: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayRecruiterNote>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayRecruiterNote>>(
    `/employer/applications/${input.applicationId}/notes`,
    {
      body: JSON.stringify({ body: input.body }),
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'POST'
    }
  );

  assert.equal(response.status, 201);
  assert.equal(body.success, true);

  return body;
}

export async function updateRecruiterNote(input: {
  accessToken: string;
  body: string;
  noteId: string;
  requestId: string;
}): Promise<SuccessEnvelope<GatewayRecruiterNote>> {
  const { body, response } = await requestJson<SuccessEnvelope<GatewayRecruiterNote>>(
    `/employer/notes/${input.noteId}`,
    {
      body: JSON.stringify({ body: input.body }),
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
        'x-request-id': input.requestId
      },
      method: 'PATCH'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function deleteRecruiterNote(input: {
  accessToken: string;
  noteId: string;
  requestId: string;
}): Promise<SuccessEnvelope<{ deleted: boolean; id: string }>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<{ deleted: boolean; id: string }>
  >(`/employer/notes/${input.noteId}`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'DELETE'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function listNotifications(input: {
  accessToken: string;
  requestId: string;
}): Promise<
  SuccessEnvelope<{
    notifications: GatewayNotification[];
    unreadCount: number;
  }>
> {
  const { body, response } = await requestJson<
    SuccessEnvelope<{
      notifications: GatewayNotification[];
      unreadCount: number;
    }>
  >('/notifications', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'GET'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function listNotificationsRequest(input: {
  accessToken: string;
  requestId: string;
}): Promise<{
  body:
    | SuccessEnvelope<{
        notifications: GatewayNotification[];
        unreadCount: number;
      }>
    | ErrorEnvelope;
  response: Response;
}> {
  return requestJson<
    | SuccessEnvelope<{
        notifications: GatewayNotification[];
        unreadCount: number;
      }>
    | ErrorEnvelope
  >('/notifications', {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'GET'
  });
}

export async function markNotificationRead(input: {
  accessToken: string;
  notificationId: string;
  requestId: string;
}): Promise<SuccessEnvelope<{ notification: GatewayNotification }>> {
  const { body, response } = await requestJson<
    SuccessEnvelope<{ notification: GatewayNotification }>
  >(`/notifications/${input.notificationId}/read`, {
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'x-request-id': input.requestId
    },
    method: 'PATCH'
  });

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}

export async function markAllNotificationsRead(input: {
  accessToken: string;
  requestId: string;
}): Promise<SuccessEnvelope<{ updatedCount: number }>> {
  const { body, response } = await requestJson<SuccessEnvelope<{ updatedCount: number }>>(
    '/notifications/read-all',
    {
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'x-request-id': input.requestId
      },
      method: 'PATCH'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(body.success, true);

  return body;
}
