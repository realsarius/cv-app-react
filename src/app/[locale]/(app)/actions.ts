'use server';

import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { LOGGING_ENABLED } from '@/config/logging';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function signOutAction() {
  const locale = await getLocale();

  if (!isSupabaseConfigured()) {
    redirect({ href: '/login', locale });
  }

  let traceId: string | null = null;
  let ip: string | null = null;
  let userAgent: string | null = null;
  if (LOGGING_ENABLED) {
    const requestHeaders = await headers();
    traceId = resolveTraceId(requestHeaders);
    const clientInfo = getClientInfo(requestHeaders);
    ip = clientInfo.ip;
    userAgent = clientInfo.userAgent;
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signOut();

  if (LOGGING_ENABLED && traceId) {
    await logger.auth({
      traceId,
      userId: user?.id ?? null,
      event: 'logout',
      provider: 'email',
      ip,
      userAgent,
      success: !error,
      failReason: error?.message ?? null,
    });
  }

  redirect({ href: '/login', locale });
}
