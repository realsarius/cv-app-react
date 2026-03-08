'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createDraftResume } from '@/lib/db/resumes';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const createResumeSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

export async function createDraftResumeAction(formData: FormData) {
  if (!isDatabaseConfigured()) {
    redirect('/dashboard?error=DATABASE_URL+eksik');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const rawTitle = formData.get('title');
  const parsed = createResumeSchema.safeParse({
    title: typeof rawTitle === 'string' ? rawTitle : undefined,
  });

  if (!parsed.success) {
    redirect('/dashboard?error=Baslik+120+karakterden+uzun+olamaz');
  }

  await createDraftResume(user.id, parsed.data.title);
  revalidatePath('/dashboard');
}
