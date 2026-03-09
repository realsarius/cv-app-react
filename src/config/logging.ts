const DEFAULT_ALWAYS_LOG_PATH_PREFIXES = [
  '/dashboard',
  '/resumes',
  '/settings',
  '/login',
  '/register',
] as const;

function parseFloatInRange(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parsePathPrefixes(value: string | undefined) {
  if (!value) {
    return [...DEFAULT_ALWAYS_LOG_PATH_PREFIXES];
  }

  const parsed = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('/'));

  if (parsed.length === 0) {
    return [...DEFAULT_ALWAYS_LOG_PATH_PREFIXES];
  }

  return parsed;
}

export const LOG_REQUEST_SAMPLE_RATE = parseFloatInRange(
  process.env.LOG_REQUEST_SAMPLE_RATE,
  0.1,
  0,
  1
);

export const LOG_SLOW_REQUEST_MS = parsePositiveInteger(
  process.env.LOG_SLOW_REQUEST_MS,
  1000
);

export const LOG_ALWAYS_PATH_PREFIXES = parsePathPrefixes(
  process.env.LOG_ALWAYS_PATH_PREFIXES
);

