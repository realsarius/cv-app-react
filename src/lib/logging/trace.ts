import { routing } from '@/i18n/routing';
import { extractClientIp } from '@/lib/security/rate-limit';

function fallbackTraceId() {
  return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function generateTraceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return fallbackTraceId();
}

export function resolveTraceId(headers: Headers) {
  return headers.get('x-trace-id') || generateTraceId();
}

export function normalizePath(pathname: string) {
  if (!pathname) {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

export function resolveLocaleFromPathname(pathname: string) {
  const maybeLocale = pathname.split('/')[1];
  if (routing.locales.includes(maybeLocale as 'tr' | 'en')) {
    return maybeLocale as (typeof routing.locales)[number];
  }

  return null;
}

export function getClientInfo(headers: Headers, pathname?: string) {
  const ip = extractClientIp((name) => headers.get(name));
  const userAgent = headers.get('user-agent');
  const locale = pathname ? resolveLocaleFromPathname(pathname) : null;

  return {
    ip,
    userAgent: userAgent || null,
    locale,
  };
}
