'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { EmailOtpType } from '@supabase/supabase-js';
import { messages } from '@/constants/messages';

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

function redirectToLoginWithError(message: string, locale: string) {
  const query = new URLSearchParams({ error: message }).toString();
  redirect({
    href: `/login?${query}`,
    locale,
  });
}

export async function verifyEmailCodeAction(formData: FormData) {
  const locale = await getLocale();

  if (!isSupabaseConfigured()) {
    redirectToLoginWithError(messages.common.supabaseEnvMissing, locale);
    return;
  }

  const email = normalizeEmail(formData.get('email'));
  const code = normalizeCode(formData.get('code'));

  if (!email || !code) {
    redirect({
      href: buildCheckEmailRedirect(
        email,
        messages.auth.verificationCodeRequired
      ),
      locale,
    });
    return;
  }

  const supabase = await createServerSupabaseClient();
  const otpTypes: EmailOtpType[] = ['signup', 'email'];
  let verificationSucceeded = false;

  for (const otpType of otpTypes) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: otpType,
    });

    if (!error) {
      verificationSucceeded = true;
      break;
    }
  }

  if (!verificationSucceeded) {
    redirect({
      href: buildCheckEmailRedirect(
        email,
        messages.auth.verificationCodeInvalidOrExpired
      ),
      locale,
    });
    return;
  }

  redirect({ href: '/dashboard', locale });
}
