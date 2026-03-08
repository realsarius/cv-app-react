import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import ResumeEditorClient from '@/features/resume-editor/ResumeEditorClient';
import { listJobTargetHistory } from '@/lib/db/job-targets';
import { getResumeEditorState } from '@/lib/db/resume-editor';
import { isDatabaseConfigured } from '@/lib/db/env';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  resumeId: z.string().uuid(),
});

type ResumeEditorPageProps = {
  params: {
    resumeId: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function ResumeEditorPage({ params }: ResumeEditorPageProps) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=Supabase+ortam+degiskenleri+eksik');
  }

  if (!isDatabaseConfigured()) {
    redirect('/dashboard?error=DATABASE_URL+veya+DATABASE_DEV_URL+eksik');
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    redirect('/dashboard?error=Resume+kimligi+gecersiz');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const editorState = await getResumeEditorState(user.id, parsedParams.data.resumeId);
  if (!editorState) {
    redirect('/dashboard?error=Resume+bulunamadi');
  }

  const jobTargetHistory = await listJobTargetHistory(
    user.id,
    editorState.resume.id,
    8
  );

  return (
    <section className='space-y-5'>
      <header className='rounded-xl border border-slate-200 bg-white p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm text-slate-500'>Resume Editor</p>
            <h1 className='text-2xl font-bold text-slate-900'>
              {editorState.resume.title}
            </h1>
          </div>
          <Link
            href='/dashboard'
            className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500'
          >
            Dashboarda don
          </Link>
        </div>
      </header>

      <ResumeEditorClient
        resumeId={editorState.resume.id}
        initialTitle={editorState.resume.title}
        initialContent={editorState.content}
        initialUpdatedAt={editorState.resume.updatedAt.toISOString()}
        initialAtsHistory={jobTargetHistory.map((item) => ({
          ...item,
          updatedAt: item.updatedAt.toISOString(),
        }))}
      />
    </section>
  );
}
