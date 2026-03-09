import {
  LOG_ALWAYS_PATH_PREFIXES,
  LOG_REQUEST_SAMPLE_RATE,
  LOG_SLOW_REQUEST_MS,
} from '@/config/logging';
import { routing } from '@/i18n/routing';
import { normalizePath } from './trace';

type ShouldLogRequestInput = {
  path: string;
  traceId: string;
  statusCode?: number | null;
  durationMs?: number | null;
  sampleRate?: number;
  slowRequestMs?: number;
  alwaysPathPrefixes?: string[];
};

function stripLocalePrefix(path: string) {
  const segments = path.split('/');
  const maybeLocale = segments[1];
  if (!routing.locales.includes(maybeLocale as 'tr' | 'en')) {
    return path;
  }

  return `/${segments.slice(2).join('/')}`.replace(/\/+$/, '') || '/';
}

function isAlwaysLogPath(path: string, prefixes: string[]) {
  const pathWithoutLocale = stripLocalePrefix(path);

  return prefixes.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      pathWithoutLocale === prefix ||
      pathWithoutLocale.startsWith(`${prefix}/`)
  );
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeRate(value: number) {
  if (!Number.isFinite(value)) {
    return LOG_REQUEST_SAMPLE_RATE;
  }

  return Math.min(1, Math.max(0, value));
}

export function shouldLogRequest(input: ShouldLogRequestInput) {
  const path = normalizePath(input.path);
  const sampleRate = normalizeRate(input.sampleRate ?? LOG_REQUEST_SAMPLE_RATE);
  const slowRequestMs = input.slowRequestMs ?? LOG_SLOW_REQUEST_MS;
  const alwaysPathPrefixes = input.alwaysPathPrefixes ?? LOG_ALWAYS_PATH_PREFIXES;

  if (isAlwaysLogPath(path, alwaysPathPrefixes)) {
    return true;
  }

  if (typeof input.statusCode === 'number' && input.statusCode >= 400) {
    return true;
  }

  if (typeof input.durationMs === 'number' && input.durationMs >= slowRequestMs) {
    return true;
  }

  if (sampleRate >= 1) {
    return true;
  }

  if (sampleRate <= 0) {
    return false;
  }

  const ratio = hashString(input.traceId) / 0xffffffff;
  return ratio < sampleRate;
}
