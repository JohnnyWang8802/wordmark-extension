interface RateLimitState {
  count: number;
  windowStart: number;
}

const failedUntil = new Map<string, number>();
const rateLimits = new Map<string, RateLimitState>();

export function isTemporarilyFailed(key: string): boolean {
  const until = failedUntil.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    failedUntil.delete(key);
    return false;
  }
  return true;
}

export function rememberTemporaryFailure(key: string, ttlMs = 5 * 60 * 1000) {
  failedUntil.set(key, Date.now() + ttlMs);
}

export function allowRequest(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const state = rateLimits.get(key);

  if (!state || now - state.windowStart > windowMs) {
    rateLimits.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (state.count >= maxRequests) return false;
  state.count += 1;
  return true;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
