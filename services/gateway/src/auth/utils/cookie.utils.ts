const DURATION_PATTERN = /^(?<value>\d+)(?<unit>ms|s|m|h|d)$/;
const DURATION_MULTIPLIERS = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
  ms: 1,
  s: 1000
} as const;

export function parseDurationToMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());

  if (!match?.groups) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const unit = match.groups.unit as keyof typeof DURATION_MULTIPLIERS;
  return Number(match.groups.value) * DURATION_MULTIPLIERS[unit];
}

export function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValueParts] = part.trim().split('=');

    if (!rawName || rawValueParts.length === 0) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join('='));
    return cookies;
  }, {});
}
