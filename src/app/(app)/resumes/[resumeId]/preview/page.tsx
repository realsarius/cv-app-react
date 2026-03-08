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

  const { content } = editorState;

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

      <article className='mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none'>
        <header className='border-b border-slate-200 pb-4'>
          <h2 className='text-3xl font-bold text-slate-900'>
            {content.personalDetails.fullName || 'Isim Soyisim'}
          </h2>
          <p className='mt-1 text-base text-slate-700'>
            {content.personalDetails.jobTitle || 'Pozisyon'}
          </p>
          <p className='mt-2 text-sm text-slate-600'>
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
          <section className='mt-6'>
            <h3 className='text-sm font-bold uppercase tracking-wide text-slate-500'>
              Profil
            </h3>
            <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800'>
              {content.profile}
            </p>
          </section>
        ) : null}

        {content.experiences.length > 0 ? (
          <section className='mt-6'>
            <h3 className='text-sm font-bold uppercase tracking-wide text-slate-500'>
              Deneyim
            </h3>
            <div className='mt-3 space-y-4'>
              {content.experiences.map((item) => (
                <div key={item.id}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-semibold text-slate-900'>
                      {item.title || 'Pozisyon'}
                      {item.company ? ` - ${item.company}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate) ? (
                      <p className='text-xs text-slate-500'>
                        {formatRange(item.startDate, item.endDate)}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className='text-xs text-slate-500'>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800'>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.educations.length > 0 ? (
          <section className='mt-6'>
            <h3 className='text-sm font-bold uppercase tracking-wide text-slate-500'>
              Egitim
            </h3>
            <div className='mt-3 space-y-4'>
              {content.educations.map((item) => (
                <div key={item.id}>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-semibold text-slate-900'>
                      {item.school || 'Okul'}
                      {item.degree ? ` - ${item.degree}` : ''}
                    </p>
                    {formatRange(item.startDate, item.endDate) ? (
                      <p className='text-xs text-slate-500'>
                        {formatRange(item.startDate, item.endDate)}
                      </p>
                    ) : null}
                  </div>
                  {item.city || item.country ? (
                    <p className='text-xs text-slate-500'>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800'>
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {content.projects.length > 0 ? (
          <section className='mt-6'>
            <h3 className='text-sm font-bold uppercase tracking-wide text-slate-500'>
              Projeler
            </h3>
            <div className='mt-3 space-y-4'>
              {content.projects.map((item) => (
                <div key={item.id}>
                  <p className='text-sm font-semibold text-slate-900'>
                    {item.title || 'Proje'}
                    {item.subtitle ? ` - ${item.subtitle}` : ''}
                  </p>
                  {item.stack ? (
                    <p className='text-xs text-slate-500'>{item.stack}</p>
                  ) : null}
                  {item.city || item.country ? (
                    <p className='text-xs text-slate-500'>
                      {[item.city, item.country].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800'>
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
