import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { messages } from '@/constants/messages';
import PaginatedResumePreview from '@/features/resume-editor/preview/PaginatedResumePreview';
import ResumePrintActions from '@/features/resume-editor/preview/ResumePrintActions';
import { getResumeEditorState } from '@/lib/db/resume-editor';
import { isDatabaseConfigured } from '@/lib/db/env';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  resumeId: z.string().uuid(),
});

type ResumePreviewPageProps = {
  params: {
    resumeId: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function ResumePreviewPage({ params }: ResumePreviewPageProps) {
  const t = await getTranslations('resume.preview');

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

  return (
    <section className='space-y-4 print:space-y-0'>
      <header className='app-card print:hidden'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm text-stone-600'>{t('title')}</p>
            <h1 className='text-xl font-bold text-stone-900'>
              {editorState.resume.title}
            </h1>
          </div>
          <ResumePrintActions resumeId={editorState.resume.id} />
        </div>
      </header>

      <PaginatedResumePreview
        title={editorState.resume.title}
        content={editorState.content}
        settings={editorState.settings}
        mode='preview'
      />
    </section>
  );
}
