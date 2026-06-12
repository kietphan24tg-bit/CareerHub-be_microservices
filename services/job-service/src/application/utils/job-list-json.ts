export function stringifyJobList(values: string[] | undefined): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  return JSON.stringify(values);
}

export function parseJobList(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Legacy rows may store lists as plain text; fall back to line splitting.
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
