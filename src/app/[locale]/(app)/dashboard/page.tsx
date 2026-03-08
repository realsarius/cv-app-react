import { Link, redirect } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { messages } from '@/constants/messages';
import { ensureUserProfile } from '@/lib/db/profiles';
import { listUserResumes } from '@/lib/db/resumes';
import { isDatabaseConfigured } from '@/lib/db/env';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createDraftResumeAction } from './actions';

type DashboardPageProps = {
  searchParams?: {
    error?: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const [t, locale] = await Promise.all([
    getTranslations('dashboard'),
    getLocale(),
  ]);
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  if (!isSupabaseConfigured()) {
    redirect(
      {
        href: `/login?${new URLSearchParams({
          error: messages.common.supabaseEnvMissing,
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

  let dbError: string | null = null;
  let profileName: string | null = null;
  let userResumes: Awaited<ReturnType<typeof listUserResumes>> = [];

  if (isDatabaseConfigured()) {
    try {
      const profile = await ensureUserProfile(user.id, user.email);
      profileName = profile?.fullName ?? null;
      userResumes = await listUserResumes(user.id);
    } catch {
      dbError = t('dbConnectionError');
    }
  }

  return (
    <section className='space-y-7'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight text-stone-900'>{t('title')}</h1>
        <p className='mt-2 text-stone-700'>
          {t('welcome')}{' '}
          <span className='font-semibold'>{profileName || user.email}</span>
        </p>
      </header>

      {searchParams?.error ? (
        <p className='message-error'>
          {searchParams.error}
        </p>
      ) : null}

      {!isDatabaseConfigured() ? (
        <p className='message-warning'>
          {t('dbMissing')}
        </p>
      ) : null}

      {dbError ? (
        <p className='message-error'>
          {dbError}
        </p>
      ) : null}

      <div className='app-card'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('newDraftTitle')}</h2>
        <form action={createDraftResumeAction} className='mt-4 flex flex-col gap-3 sm:flex-row'>
          <input
            type='text'
            name='title'
            maxLength={120}
            placeholder={t('newDraftPlaceholder')}
            className='form-input'
          />
          <button type='submit' className='btn-primary' disabled={!isDatabaseConfigured()}>
            {t('newDraftSubmit')}
          </button>
        </form>
      </div>

      <div className='app-card'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('resumeListTitle')}</h2>

        {isDatabaseConfigured() && userResumes.length === 0 ? (
          <p className='mt-3 text-sm text-stone-700'>
            {t('emptyResumes')}
          </p>
        ) : null}

        <ul className='mt-3 space-y-3'>
          {userResumes.map((resume) => (
            <li
              key={resume.id}
              className='rounded-md border border-stone-200 px-4 py-3 text-sm text-stone-800'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='font-semibold text-stone-900'>{resume.title}</span>
                <span className='rounded-md bg-stone-100 px-2 py-0.5 text-xs uppercase text-stone-700'>
                  {resume.status}
                </span>
              </div>
              <p className='mt-1 text-xs text-stone-600'>
                {t('lastUpdated')}: {new Date(resume.updatedAt).toLocaleString(dateLocale)}
              </p>
              <Link
                href={`/resumes/${resume.id}`}
                className='mt-2 inline-flex rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-500'
              >
                {t('openEditor')}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
