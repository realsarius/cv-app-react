'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function signOutAction() {
  const locale = await getLocale();

  if (!isSupabaseConfigured()) {
    redirect({ href: '/login', locale });
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect({ href: '/login', locale });
}
