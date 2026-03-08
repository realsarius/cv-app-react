'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function registerAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/register?error=Supabase+ortam+degiskenleri+eksik');
  }

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirect('/register?error=Kayit+bilgileri+gecersiz');
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
    redirect(
      '/register?error=Cok+fazla+kayit+denemesi+algilandi.+Lutfen+daha+sonra+tekrar+deneyin'
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}
