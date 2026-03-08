import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { messages } from '@/constants/messages';
import { ensureUserProfile, getOwnProfile } from '@/lib/db/profiles';
import { isDatabaseConfigured } from '@/lib/db/env';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateProfileAction } from './actions';

type SettingsPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

export const dynamic = 'force-dynamic';

function formatDateTime(
  value: string | Date | null | undefined,
  locale: string,
  unknownLabel: string
) {
  if (!value) {
    return unknownLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return unknownLabel;
  }

  return parsed.toLocaleString(locale);
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [t, tCommon, locale] = await Promise.all([
    getTranslations('settings'),
    getTranslations('common'),
    getLocale(),
  ]);
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US';

  if (!isSupabaseConfigured()) {
    redirect(
      `/login?${new URLSearchParams({
        error: messages.common.supabaseEnvMissing,
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

  if (!isDatabaseConfigured()) {
    redirect(
      `/dashboard?${new URLSearchParams({
        error: messages.common.databaseUrlMissing,
      }).toString()}`
    );
  }

  await ensureUserProfile(user.id, user.email);
  const profile = await getOwnProfile(user.id);
  const authProvider =
    typeof user.app_metadata?.provider === 'string'
      ? user.app_metadata.provider
      : 'email';
  const isEmailConfirmed = Boolean(user.email_confirmed_at);

  return (
    <section className='space-y-7'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight text-stone-900'>
          {t('title')}
        </h1>
        <p className='mt-2 text-stone-700'>
          {t('description')}
        </p>
      </header>

      {searchParams?.error ? (
        <p className='message-error'>
          {searchParams.error}
        </p>
      ) : null}

      {searchParams?.success ? (
        <p className='message-success'>
          {searchParams.success}
        </p>
      ) : null}

      <div className='app-card'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('summaryTitle')}</h2>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('userId')}</p>
            <p className='mt-1 break-all text-sm font-medium text-stone-900'>{user.id}</p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('provider')}</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>{authProvider}</p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('emailVerification')}</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {isEmailConfirmed ? t('verified') : t('notVerified')}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('accountCreated')}</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(user.created_at, dateLocale, tCommon('unknown'))}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('lastSignIn')}</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(user.last_sign_in_at, dateLocale, tCommon('unknown'))}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>{t('profileUpdatedAt')}</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(profile?.updatedAt, dateLocale, tCommon('unknown'))}
            </p>
          </div>
        </div>
      </div>

      <div className='app-card'>
        <h2 className='text-lg font-semibold text-stone-900'>{t('profileTitle')}</h2>
        <p className='mt-2 text-sm text-stone-600'>
          {t('profileDescription')}
        </p>

        <form action={updateProfileAction} className='space-y-4'>
          <label className='block'>
            <span className='form-label'>{t('email')}</span>
            <input
              type='email'
              value={profile?.email ?? user.email ?? ''}
              disabled
              className='form-input bg-stone-50 text-stone-500'
            />
          </label>

          <label className='block'>
            <span className='form-label'>
              {t('fullName')}
            </span>
            <input
              type='text'
              name='fullName'
              maxLength={120}
              defaultValue={profile?.fullName ?? ''}
              className='form-input'
              placeholder={t('fullNamePlaceholder')}
            />
          </label>

          <button type='submit' className='btn-primary'>
            {t('submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
