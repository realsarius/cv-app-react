'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { z } from 'zod';
import { messages } from '@/constants/messages';
import { ensureUserProfile, updateOwnProfile } from '@/lib/db/profiles';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const profileSchema = z.object({
  fullName: z.string().trim().max(120),
});

export async function updateProfileAction(formData: FormData) {
  const locale = await getLocale();

  if (!isDatabaseConfigured()) {
    redirect({ href: '/settings?error=DATABASE_URL+veya+DATABASE_DEV_URL+eksik', locale });
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
          error: messages.profile.fullNameTooLong,
        }).toString()}`,
        locale,
      }
    );
    return;
  }

  await ensureUserProfile(user.id, user.email);
  await updateOwnProfile(user.id, parsed.data.fullName);

  redirect(
    {
      href: `/settings?${new URLSearchParams({
        success: messages.profile.profileUpdated,
      }).toString()}`,
      locale,
    }
  );
}
