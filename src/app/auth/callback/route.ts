import type { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestMessages } from '@/lib/i18n/request-messages';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const DEFAULT_NEXT_PATH = '/dashboard';

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function parseOtpType(value: string | null) {
  if (!value) {
    return null;
  }

  return SUPPORTED_OTP_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_NEXT_PATH;
  }

  return value;
}

function redirectToLoginWithError(request: NextRequest, message: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const messages = getRequestMessages(request);

  if (!isSupabaseConfigured()) {
    return redirectToLoginWithError(request, messages.common.supabaseEnvMissing);
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const token = requestUrl.searchParams.get('token');
  const email = requestUrl.searchParams.get('email');
  const otpType = parseOtpType(requestUrl.searchParams.get('type'));
  const nextPath = resolveNextPath(requestUrl.searchParams.get('next'));
  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLoginWithError(request, error.message);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });

    if (error) {
      return redirectToLoginWithError(request, error.message);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (token && email && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: otpType,
    });

    if (error) {
      return redirectToLoginWithError(request, error.message);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return redirectToLoginWithError(
    request,
    messages.auth.errors.verifyLinkInvalidOrExpired
  );
}
