import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { messages } from '@/constants/messages';
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
    redirect(
      `/login?${new URLSearchParams({
        error: messages.common.supabaseEnvMissing,
      }).toString()}`
    );
  }

  if (!isDatabaseConfigured()) {
    redirect(
      `/dashboard?${new URLSearchParams({
        error: messages.common.databaseUrlMissing,
      }).toString()}`
    );
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    redirect(
      `/dashboard?${new URLSearchParams({
        error: messages.resume.idInvalid,
      }).toString()}`
    );
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
    redirect(
      `/dashboard?${new URLSearchParams({
        error: messages.resume.notFound,
      }).toString()}`
    );
  }

  const jobTargetHistory = await listJobTargetHistory(
    user.id,
    editorState.resume.id,
    8
  );

  return (
    <section className='space-y-7'>
      <header className='app-card'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm text-stone-600'>Özgeçmiş düzenleyici</p>
            <h1 className='text-2xl font-bold tracking-tight text-stone-900'>
              {editorState.resume.title}
            </h1>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              href='/dashboard'
              className='btn-secondary'
            >
              Panele dön
            </Link>
            <Link
              href={`/resumes/${editorState.resume.id}/preview`}
              className='btn-secondary'
            >
              Önizle / Yazdır
            </Link>
          </div>
        </div>
      </header>

      <ResumeEditorClient
        resumeId={editorState.resume.id}
        initialTitle={editorState.resume.title}
        initialContent={editorState.content}
        initialUpdatedAt={editorState.resume.updatedAt.toISOString()}
        initialSettings={{
          ...editorState.settings,
          updatedAt: editorState.settings.updatedAt.toISOString(),
        }}
        initialAtsHistory={jobTargetHistory.map((item) => ({
          ...item,
          updatedAt: item.updatedAt.toISOString(),
        }))}
      />
    </section>
  );
}
