import { redirect } from 'next/navigation';
import { z } from 'zod';
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

function formatRange(startDate: string, endDate: string) {
  const start = startDate.trim();
  const end = endDate.trim();

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return `${start} - Devam ediyor`;
  }

  if (end) {
    return end;
  }

  return '';
}

export const dynamic = 'force-dynamic';

export default async function ResumePreviewPage({ params }: ResumePreviewPageProps) {
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

  const { content, settings } = editorState;
  const isCompactTemplate = settings.templateKey === 'ats-compact';
  const palette =
    settings.colorScheme === 'mono'
      ? {
          border: 'border-zinc-300',
          title: 'text-zinc-900',
          body: 'text-zinc-800',
          muted: 'text-zinc-600',
          sectionLabel: 'text-zinc-500',
        }
      : settings.colorScheme === 'slate'
        ? {
            border: 'border-slate-300',
            title: 'text-slate-950',
            body: 'text-slate-800',
            muted: 'text-slate-600',
            sectionLabel: 'text-slate-500',
          }
        : {
            border: 'border-slate-200',
            title: 'text-slate-900',
            body: 'text-slate-800',
            muted: 'text-slate-600',
            sectionLabel: 'text-slate-500',
          };
  const sectionSpacing = isCompactTemplate ? 'mt-4' : 'mt-6';
  const contentSpacing = isCompactTemplate ? 'space-y-3' : 'space-y-4';
  const paragraphSpacing = isCompactTemplate ? 'leading-5' : 'leading-6';
  const articleLineHeight = Math.max(
    1.3,
    Math.min(2, Number((1.55 * settings.spacingScale).toFixed(2)))
  );

  return (
    <section className='space-y-4 print:space-y-0'>
      <header className='rounded-xl border border-slate-200 bg-white p-4 print:hidden'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm text-slate-500'>ATS Preview</p>
            <h1 className='text-xl font-bold text-slate-900'>
              {editorState.resume.title}
            </h1>
          </div>
          <ResumePrintActions resumeId={editorState.resume.id} />
        </div>
      </header>

      <article
        style={{
          fontSize: `${settings.fontScale}rem`,
          lineHeight: articleLineHeight,
        }}
        className={`mx-auto w-full max-w-[210mm] rounded-xl border bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none ${palette.border} ${isCompactTemplate ? 'p-6' : 'p-8'}`}
      >
        <header className={`border-b pb-4 ${palette.border}`}>
          <h2
            className={`${isCompactTemplate ? 'text-2xl' : 'text-3xl'} font-bold ${palette.title}`}
          >
            {content.personalDetails.fullName || 'Isim Soyisim'}
          </h2>
          <p className={`mt-1 text-base ${palette.body}`}>
            {content.personalDetails.jobTitle || 'Pozisyon'}
          </p>
          <p className={`mt-2 text-sm ${palette.muted}`}>
            {[
              content.personalDetails.email,
              content.personalDetails.phone,
              content.personalDetails.address,
            ]
              .filter(Boolean)
              .join(' | ')}
          </p>
        </header>

        {content.profile ? (
          <section className={sectionSpacing}>
            <h3
              className={`text-sm font-bold uppercase tracking-wide ${palette.sectionLabel}`}
            >
              Profil
            </h3>
            <p className={`mt-2 whitespace-pre-wrap text-sm ${paragraphSpacing} ${palette.body}`}>
              {content.profile}
            </p>
          </section>
        ) : null}

        {content.experiences.length > 0 ? (
          <section className={sectionSpacing}>
            <h3
              className={`text-sm font-bold uppercase tracking-wide ${palette.sectionLabel}`}
            >
              Deneyim
            </h3>
            <div className={`mt-3 ${contentSpacing}`}>
              {content.experiences.map((item) => (
                <div key={item.id}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className={`text-sm font-semibold ${palette.title}`}>
                      {item.title || 'Pozisyon'}
                      {item.company ? ` - ${item.company}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate) ? (
                      <p className={`text-xs ${palette.sectionLabel}`}>
                        {formatRange(item.startDate, item.endDate)}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className={`text-xs ${palette.sectionLabel}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-sm ${paragraphSpacing} ${palette.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.educations.length > 0 ? (
          <section className={sectionSpacing}>
            <h3
              className={`text-sm font-bold uppercase tracking-wide ${palette.sectionLabel}`}
            >
              Egitim
            </h3>
            <div className={`mt-3 ${contentSpacing}`}>
              {content.educations.map((item) => (
                <div key={item.id}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className={`text-sm font-semibold ${palette.title}`}>
                      {item.school || 'Okul'}
                      {item.degree ? ` - ${item.degree}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate) ? (
                      <p className={`text-xs ${palette.sectionLabel}`}>
                        {formatRange(item.startDate, item.endDate)}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className={`text-xs ${palette.sectionLabel}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-sm ${paragraphSpacing} ${palette.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.projects.length > 0 ? (
          <section className={sectionSpacing}>
            <h3
              className={`text-sm font-bold uppercase tracking-wide ${palette.sectionLabel}`}
            >
              Projeler
            </h3>
            <div className={`mt-3 ${contentSpacing}`}>
              {content.projects.map((item) => (
                <div key={item.id}>
                  <p className={`text-sm font-semibold ${palette.title}`}>
                    {item.title || 'Proje'}
                    {item.subtitle ? ` - ${item.subtitle}` : ''}
                  </p>
                  {item.stack ? (
                    <p className={`text-xs ${palette.sectionLabel}`}>{item.stack}</p>
                  ) : null}
                  {item.city || item.country ? (
                    <p className={`text-xs ${palette.sectionLabel}`}>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className={`mt-1 whitespace-pre-wrap text-sm ${paragraphSpacing} ${palette.body}`}>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );
}
