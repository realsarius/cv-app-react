'use server';

import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { LOGGING_ENABLED } from '@/config/logging';
import { logger } from '@/lib/logging/logger';
import { hashEmailForAudit } from '@/lib/logging/privacy';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { EmailOtpType } from '@supabase/supabase-js';

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function normalizeCode(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, '').trim();
}

function buildCheckEmailRedirect(email: string, error: string) {
  const query = new URLSearchParams();

  if (email) {
    query.set('email', email);
  }

  query.set('error', error);

  return `/register/check-email?${query.toString()}`;
}

type AppLocale = Awaited<ReturnType<typeof getLocale>>;

function redirectToLoginWithError(message: string, locale: AppLocale) {
  const query = new URLSearchParams({ error: message }).toString();
  redirect({
    href: `/login?${query}`,
    locale,
  });
}

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export async function verifyEmailCodeAction(formData: FormData) {
  const [locale, tCommon, tAuthErrors] = await Promise.all([
    getLocale(),
    getTranslations('common'),
    getTranslations('auth.errors'),
  ]);

  if (!isSupabaseConfigured()) {
    redirectToLoginWithError(trimTrailingDot(tCommon('supabaseEnvMissing')), locale);
    return;
  }

  const email = normalizeEmail(formData.get('email'));
  const code = normalizeCode(formData.get('code'));
  let traceId: string | null = null;
  let ip: string | null = null;
  let userAgent: string | null = null;
  if (LOGGING_ENABLED) {
    const requestHeaders = await headers();
    traceId = resolveTraceId(requestHeaders);
    const clientInfo = getClientInfo(requestHeaders);
    ip = clientInfo.ip;
    userAgent = clientInfo.userAgent;
  }

  const emailHash = hashEmailForAudit(email);

  if (!email || !code) {
    redirect({
      href: buildCheckEmailRedirect(
        email,
        tAuthErrors('verificationCodeRequired')
      ),
      locale,
    });
    return;
  }

  const supabase = await createServerSupabaseClient();
  const otpTypes: EmailOtpType[] = ['signup', 'email'];
  let verificationSucceeded = false;
  let verifiedUserId: string | null = null;
  let lastErrorMessage: string | null = null;

  for (const otpType of otpTypes) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: otpType,
    });

    if (!error) {
      verificationSucceeded = true;
      verifiedUserId = data?.user?.id ?? null;
      break;
    }

    lastErrorMessage = error.message;
  }

  if (!verificationSucceeded) {
    if (LOGGING_ENABLED && traceId) {
      await logger.auth({
        traceId,
        userId: null,
        emailHash,
        event: 'email_verified',
        provider: 'email',
        ip,
        userAgent,
        success: false,
        failReason: lastErrorMessage ?? 'verification_failed',
      });
    }

    redirect({
      href: buildCheckEmailRedirect(
        email,
        tAuthErrors('verificationCodeInvalidOrExpired')
      ),
      locale,
    });
    return;
  }

  if (LOGGING_ENABLED && traceId) {
    await logger.auth({
      traceId,
      userId: verifiedUserId,
      emailHash,
      event: 'email_verified',
      provider: 'email',
      ip,
      userAgent,
      success: true,
    });
  }

  redirect({ href: '/dashboard', locale });
}
