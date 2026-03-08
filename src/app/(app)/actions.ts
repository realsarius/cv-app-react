'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function signOutAction() {
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
