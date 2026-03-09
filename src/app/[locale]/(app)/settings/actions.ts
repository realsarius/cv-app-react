'use server';

import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { z } from 'zod';
import { LOGGING_ENABLED } from '@/config/logging';
import { ensureUserProfile, updateOwnProfile } from '@/lib/db/profiles';
import { isDatabaseConfigured } from '@/lib/db/env';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const profileSchema = z.object({
  fullName: z.string().trim().max(120),
});

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export async function updateProfileAction(formData: FormData) {
  const [locale, tCommon, tProfileErrors, tProfileSuccess] = await Promise.all([
    getLocale(),
    getTranslations('common'),
    getTranslations('profile.errors'),
    getTranslations('profile.success'),
  ]);

  if (!isDatabaseConfigured()) {
    redirect(
      {
        href: `/settings?${new URLSearchParams({
          error: trimTrailingDot(tCommon('databaseUrlMissing')),
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
    return;
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
  });

  if (!parsed.success) {
    redirect(
      {
        href: `/settings?${new URLSearchParams({
          error: trimTrailingDot(tProfileErrors('fullNameTooLong')),
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  await ensureUserProfile(user.id, user.email);
  await updateOwnProfile(user.id, parsed.data.fullName);

  if (LOGGING_ENABLED) {
    const requestHeaders = await headers();
    const traceId = resolveTraceId(requestHeaders);
    const clientInfo = getClientInfo(requestHeaders);

    await logger.audit({
      traceId,
      userId: user.id,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      resourceType: 'profile',
      resourceId: user.id,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      metadata: {
        fullNameLength: parsed.data.fullName.length,
      },
    });
  }

  redirect(
    {
      href: `/settings?${new URLSearchParams({
        success: trimTrailingDot(tProfileSuccess('profileUpdated')),
      }).toString()}`,
      locale,
    }
  );
}
