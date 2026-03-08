'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
