'use server';

import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { z } from 'zod';
import { LOGGING_ENABLED } from '@/config/logging';
import { createDraftResume } from '@/lib/db/resumes';
import { isDatabaseConfigured } from '@/lib/db/env';
import { AUDIT_ACTIONS } from '@/lib/logging/actions';
import { logger } from '@/lib/logging/logger';
import { getClientInfo, resolveTraceId } from '@/lib/logging/trace';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const createResumeSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export async function createDraftResumeAction(formData: FormData) {
  const [locale, tCommon, tResumeErrors, tDashboard] = await Promise.all([
    getLocale(),
    getTranslations('common'),
    getTranslations('resume.errors'),
    getTranslations('dashboard'),
  ]);

  if (!isDatabaseConfigured()) {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
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

  const rawTitle = formData.get('title');
  const parsed = createResumeSchema.safeParse({
    title: typeof rawTitle === 'string' ? rawTitle : undefined,
  });

  if (!parsed.success) {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
          error: trimTrailingDot(tResumeErrors('titleTooLong')),
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  let createdResume: Awaited<ReturnType<typeof createDraftResume>>;
  try {
    const resolvedTitle =
      typeof parsed.data.title === 'string' && parsed.data.title.length > 0
        ? parsed.data.title
        : tDashboard('newDraftDefaultTitle');
    createdResume = await createDraftResume(user.id, resolvedTitle);

    if (LOGGING_ENABLED) {
      const requestHeaders = await headers();
      const traceId = resolveTraceId(requestHeaders);
      const clientInfo = getClientInfo(requestHeaders);

      await logger.audit({
        traceId,
        userId: user.id,
        action: AUDIT_ACTIONS.RESUME_CREATED,
        resourceType: 'resume',
        resourceId: createdResume.id,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        metadata: {
          title: createdResume.title,
          status: createdResume.status,
        },
      });
    }
  } catch {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
          error: tResumeErrors('createFailed'),
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  redirect({ href: `/resumes/${createdResume.id}`, locale });
}
