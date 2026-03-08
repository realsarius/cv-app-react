import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { z } from 'zod';
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

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

export default async function ResumePreviewPage({ params }: ResumePreviewPageProps) {
  const [t, tCommon, tResumeErrors, locale] = await Promise.all([
    getTranslations('resume.preview'),
    getTranslations('common'),
    getTranslations('resume.errors'),
    getLocale(),
  ]);

  if (!isSupabaseConfigured()) {
    redirect(
      {
        href: `/login?${new URLSearchParams({
          error: trimTrailingDot(tCommon('supabaseEnvMissing')),
        }).toString()}`,
        locale,
      }
    );
    return null;
  }

  if (!isDatabaseConfigured()) {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
          error: trimTrailingDot(tCommon('databaseUrlMissing')),
        }).toString()}`,
        locale,
      }
    );
    return null;
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
          error: trimTrailingDot(tResumeErrors('idInvalid')),
        }).toString()}`,
        locale,
      }
    );
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
    return null;
  }

  const editorState = await getResumeEditorState(user.id, parsedParams.data.resumeId);
  if (!editorState) {
    redirect(
      {
        href: `/dashboard?${new URLSearchParams({
          error: trimTrailingDot(tResumeErrors('notFound')),
        }).toString()}`,
        locale,
      }
    );
    return null;
  }

  return (
    <section className='space-y-4 print:space-y-0'>
      <header className='app-card no-print print:hidden'>
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

      <div id='cv-print-area'>
        <PaginatedResumePreview
          title={editorState.resume.title}
          content={editorState.content}
          settings={editorState.settings}
          mode='preview'
        />
      </div>
    </section>
  );
}
