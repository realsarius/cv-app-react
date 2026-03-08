'use server';

import { redirect } from 'next/navigation';
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

function redirectToLoginWithError(message: string): never {
  const query = new URLSearchParams({ error: message }).toString();
  redirect(`/login?${query}`);
}

export async function verifyEmailCodeAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectToLoginWithError(messages.common.supabaseEnvMissing);
  }

  const email = normalizeEmail(formData.get('email'));
  const code = normalizeCode(formData.get('code'));

  if (!email || !code) {
    redirect(
      buildCheckEmailRedirect(
        email,
        messages.auth.verificationCodeRequired
      )
    );
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
    redirect(
      buildCheckEmailRedirect(
        email,
        messages.auth.verificationCodeInvalidOrExpired
      )
    );
  }

  redirect('/dashboard');
}
