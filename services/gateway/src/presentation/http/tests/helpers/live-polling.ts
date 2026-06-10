export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollUntil<T>(
  work: () => Promise<T | null>,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const intervalMs = options?.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await work();

    if (result !== null) {
      return result;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMs}ms while waiting for async condition`);
}
