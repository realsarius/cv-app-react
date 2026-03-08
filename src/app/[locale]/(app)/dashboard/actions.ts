'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { z } from 'zod';
import { messages } from '@/constants/messages';
import { createDraftResume } from '@/lib/db/resumes';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const createResumeSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

export async function createDraftResumeAction(formData: FormData) {
  const locale = await getLocale();

  if (!isDatabaseConfigured()) {
    redirect({ href: '/dashboard?error=DATABASE_URL+eksik', locale });
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
          error: messages.resume.titleTooLong,
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  const createdResume = await createDraftResume(user.id, parsed.data.title);
  redirect({ href: `/resumes/${createdResume.id}`, locale });
}
