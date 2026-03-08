type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type GlobalWithRateLimitStore = typeof globalThis & {
  __cvAppRateLimitStore?: Map<string, RateLimitEntry>;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

export type CheckRateLimitInput = {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

function getStore() {
  const scope = globalThis as GlobalWithRateLimitStore;
  if (!scope.__cvAppRateLimitStore) {
    scope.__cvAppRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return scope.__cvAppRateLimitStore;
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, nowMs: number) {
  if (store.size < 5000) {
    return;
  }

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= nowMs) {
      store.delete(key);
    }
  }
}

function clampPositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

export function extractClientIp(getHeader: (name: string) => string | null) {
  const candidateHeaders = [
    getHeader('x-forwarded-for'),
    getHeader('x-real-ip'),
    getHeader('cf-connecting-ip'),
  ];

  for (const rawValue of candidateHeaders) {
    if (!rawValue) {
      continue;
    }

    const first = rawValue
      .split(',')[0]
      ?.trim()
      .replace(/:\d+$/, '');

    if (first) {
      return first;
    }
  }

  return null;
}

export function checkRateLimit(input: CheckRateLimitInput): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  const limit = clampPositiveInteger(input.limit, 1);
  const windowMs = clampPositiveInteger(input.windowMs, 60_000);
  const bucket = input.bucket.trim() || 'default';
  const identifier = input.identifier.trim() || 'anonymous';
  const key = `${bucket}:${identifier}`;

  const store = getStore();
  cleanupExpiredEntries(store, nowMs);

  let entry = store.get(key);

  if (!entry || nowMs >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: nowMs + windowMs,
    };
    store.set(key, entry);
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000)),
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000)),
  };
}

export function buildRateLimitHeaders(
  result: RateLimitResult,
  includeRetryAfter = !result.allowed
) {
  const headers: Record<string, string> = {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(result.remaining),
    'x-ratelimit-reset': String(Math.floor(result.resetAt / 1000)),
  };

  if (includeRetryAfter) {
    headers['retry-after'] = String(result.retryAfterSec);
  }

  return headers;
}

export function __resetRateLimitStoreForTests() {
  getStore().clear();
}
