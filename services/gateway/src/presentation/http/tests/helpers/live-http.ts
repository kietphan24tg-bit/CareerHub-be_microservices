import { GATEWAY_BASE_URL } from './live-env';

export function createUniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2, 8)}@example.com`;
}

export function createRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function extractCookieValue(
  cookieHeader: string,
  name: string
): string | undefined {
  const [pair] = cookieHeader.split(';');
  const [cookieName, cookieValue] = pair.split('=');

  if (cookieName?.trim() !== name) {
    return undefined;
  }

  return cookieValue;
}

export function extractRefreshToken(setCookieHeaders: string[]): string {
  for (const header of setCookieHeaders) {
    const value = extractCookieValue(header, 'refresh_token');

    if (value) {
      return value;
    }
  }

  throw new Error('refresh_token cookie not found in response headers');
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ body: T; response: Response }> {
  let response: Response;

  try {
    response = await fetch(`${GATEWAY_BASE_URL}${path}`, init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';

    throw new Error(
      `Failed to reach gateway live endpoint ${GATEWAY_BASE_URL}${path}. Cause: ${reason}`
    );
  }

  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);

  return { body, response };
}
