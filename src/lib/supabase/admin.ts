import { createClient } from '@supabase/supabase-js';

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlanmalıdır.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

