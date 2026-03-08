'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ensureUserProfile, updateOwnProfile } from '@/lib/db/profiles';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const profileSchema = z.object({
  fullName: z.string().trim().max(120),
});

export async function updateProfileAction(formData: FormData) {
  if (!isDatabaseConfigured()) {
    redirect('/settings?error=DATABASE_URL+veya+DATABASE_DEV_URL+eksik');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
  });

  if (!parsed.success) {
    redirect('/settings?error=Ad+soyad+120+karakterden+uzun+olamaz');
  }

  await ensureUserProfile(user.id, user.email);
  await updateOwnProfile(user.id, parsed.data.fullName);

  redirect('/settings?success=Profil+guncellendi');
}
