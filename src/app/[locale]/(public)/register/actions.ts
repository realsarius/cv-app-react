'use server';

import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPathname, redirect } from '@/i18n/navigation';
import { LOGGING_ENABLED } from '@/config/logging';
import { logger } from '@/lib/logging/logger';
import { hashEmailForAudit } from '@/lib/logging/privacy';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type AppLocale = Awaited<ReturnType<typeof getLocale>>;

function redirectWithError(pathname: string, message: string, locale: AppLocale) {
  const query = new URLSearchParams({ error: message }).toString();
  redirect({
    href: `${pathname}?${query}`,
    locale,
  });
}

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

function resolveBaseUrl(requestHeaders: Headers) {
  const origin = requestHeaders.get('origin');
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  if (!host) {
    return null;
  }

  const proto = requestHeaders.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function registerAction(formData: FormData) {
  const [locale, tCommon, tAuthErrors] = await Promise.all([
    getLocale(),
    getTranslations('common'),
    getTranslations('auth.errors'),
  ]);

  if (!isSupabaseConfigured()) {
    redirectWithError('/register', trimTrailingDot(tCommon('supabaseEnvMissing')), locale);
    return;
  }

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirectWithError('/register', trimTrailingDot(tAuthErrors('registerInvalidInput')), locale);
    return;
  }

  const requestHeaders = await headers();
  const traceId = resolveTraceId(requestHeaders);
  const { ip, userAgent } = getClientInfo(requestHeaders);
  const emailHash = hashEmailForAudit(email);
  const clientIp = extractClientIp((name) => requestHeaders.get(name));
  const rateLimitResult = checkRateLimit({
    bucket: 'auth-register',
    identifier: clientIp || email.trim().toLowerCase(),
    limit: 4,
    windowMs: 10 * 60_000,
  });

  if (!rateLimitResult.allowed) {
    redirectWithError('/register', trimTrailingDot(tAuthErrors('registerRateLimited')), locale);
    return;
  }

  const supabase = await createServerSupabaseClient();
  const baseUrl = resolveBaseUrl(requestHeaders);
  const callbackNext = getPathname({
    href: '/dashboard',
    locale,
  });
  const emailRedirectTo = baseUrl
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(callbackNext)}`
    : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    if (LOGGING_ENABLED) {
      await logger.auth({
        traceId,
        userId: null,
        emailHash,
        event: 'register',
        provider: 'email',
        ip,
        userAgent,
        success: false,
        failReason: error.message,
      });
    }

    redirectWithError('/register', error.message, locale);
    return;
  }

  if (LOGGING_ENABLED) {
    await logger.auth({
      traceId,
      userId: data.user?.id ?? null,
      emailHash,
      event: 'register',
      provider: 'email',
      ip,
      userAgent,
      success: true,
    });
  }

  redirect({
    href: `/register/check-email?email=${encodeURIComponent(email)}`,
    locale,
  });
}
