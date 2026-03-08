'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function loginAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=Supabase+ortam+degiskenleri+eksik');
  }

  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    redirect('/login?error=Giris+bilgileri+gecersiz');
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
    redirect(
      '/login?error=Cok+fazla+giris+denemesi+algilandi.+Lutfen+biraz+sonra+tekrar+deneyin'
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}
