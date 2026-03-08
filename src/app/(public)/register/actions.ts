'use server';

import { redirect } from 'next/navigation';
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
