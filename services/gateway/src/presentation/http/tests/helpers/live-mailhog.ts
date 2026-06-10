import { MAILHOG_API_BASE_URL, RESET_PASSWORD_URL_BASE } from './live-env';
import { pollUntil } from './live-polling';

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function extractResetTokenFromBody(body: string): string | undefined {
  const normalizedBody = body
    .replaceAll('&amp;', '&')
    .replaceAll('=3D', '=')
    .replace(/=\r?\n/g, '');
  const tokenMatch = normalizedBody.match(
    new RegExp(
      `${RESET_PASSWORD_URL_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?token=([^\\s"'<>]+)`
    )
  );

  if (!tokenMatch?.[1]) {
    return undefined;
  }

  return decodeURIComponent(tokenMatch[1]);
}

export async function fetchPasswordResetTokenFromMailHog(
  email: string
): Promise<string> {
  return pollUntil(async () => {
    let response: Response;

    try {
      response = await fetch(`${MAILHOG_API_BASE_URL}/api/v2/messages`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';

      throw new Error(
        `Failed to reach MailHog at ${MAILHOG_API_BASE_URL}. Cause: ${reason}`
      );
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      items?: Array<{
        Content?: {
          Body?: unknown;
          Headers?: Record<string, unknown>;
        };
      }>;
    };

    for (const item of payload.items ?? []) {
      const headers = item.Content?.Headers ?? {};
      const recipients = [
        ...readStringArray(headers.To),
        ...readStringArray(headers['Delivered-To'])
      ];

      if (!recipients.some((recipient) => recipient.includes(email))) {
        continue;
      }

      const body = typeof item.Content?.Body === 'string' ? item.Content.Body : '';
      const resetToken = extractResetTokenFromBody(body);

      if (resetToken) {
        return resetToken;
      }
    }

    return null;
  });
}
