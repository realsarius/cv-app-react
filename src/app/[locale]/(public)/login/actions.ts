'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { messages } from '@/constants/messages';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function redirectWithError(pathname: string, message: string, locale: string) {
  const query = new URLSearchParams({ error: message }).toString();
  redirect({
    href: `${pathname}?${query}`,
    locale,
  });
}

function mapAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes('email not confirmed')) {
    return messages.auth.emailNotConfirmed;
  }

  return message;
}

export async function loginAction(formData: FormData) {
  const locale = await getLocale();

  if (!isSupabaseConfigured()) {
    redirectWithError('/login', messages.common.supabaseEnvMissing, locale);
    return;
  }

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirectWithError('/login', messages.auth.invalidLoginCredentials, locale);
    return;
  }

  const requestHeaders = await headers();
  const clientIp = extractClientIp((name) => requestHeaders.get(name));
  const rateLimitResult = checkRateLimit({
    bucket: 'auth-login',
    identifier: clientIp || email.trim().toLowerCase(),
    limit: 6,
    windowMs: 5 * 60_000,
  });

  if (!rateLimitResult.allowed) {
    redirectWithError('/login', messages.auth.loginRateLimited, locale);
    return;
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const mappedMessage = mapAuthErrorMessage(error.message);
    redirectWithError('/login', mappedMessage, locale);
    return;
  }

  redirect({ href: '/dashboard', locale });
}
