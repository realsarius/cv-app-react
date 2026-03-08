'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { messages } from '@/constants/messages';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function redirectWithError(pathname: string, message: string): never {
  const query = new URLSearchParams({ error: message }).toString();
  redirect(`${pathname}?${query}`);
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
  if (!isSupabaseConfigured()) {
    redirectWithError('/register', messages.common.supabaseEnvMissing);
  }

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirectWithError('/register', messages.auth.registerInvalidInput);
  }

  const requestHeaders = await headers();
  const clientIp = extractClientIp((name) => requestHeaders.get(name));
  const rateLimitResult = checkRateLimit({
    bucket: 'auth-register',
    identifier: clientIp || email.trim().toLowerCase(),
    limit: 4,
    windowMs: 10 * 60_000,
  });

  if (!rateLimitResult.allowed) {
    redirectWithError('/register', messages.auth.registerRateLimited);
  }

  const supabase = await createServerSupabaseClient();
  const baseUrl = resolveBaseUrl(requestHeaders);
  const callbackNext = '/dashboard';
  const emailRedirectTo = baseUrl
    ? `${baseUrl}/auth/callback?next=${encodeURIComponent(callbackNext)}`
    : undefined;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    redirectWithError('/register', error.message);
  }

  redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
}
