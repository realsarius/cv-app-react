import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { listRecentAuthEvents } from '@/lib/db/kvkk';
import { ensureUserProfile, getOwnProfile } from '@/lib/db/profiles';
import { isDatabaseConfigured } from '@/lib/db/env';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DeleteAccountButton } from './DeleteAccountButton';
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

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
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
      {
        href: `/login?${new URLSearchParams({
          error: trimTrailingDot(tCommon('supabaseEnvMissing')),
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

  await ensureUserProfile(user.id, user.email);
  const [profile, recentAuthEvents] = await Promise.all([
    getOwnProfile(user.id),
    listRecentAuthEvents(user.id, 10),
  ]);
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

      <div className='app-card space-y-5'>
        <div>
          <h2 className='text-lg font-semibold text-stone-900'>
            {t('privacy.title')}
          </h2>
          <p className='mt-2 text-sm text-stone-600'>
            {t('privacy.description')}
          </p>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='rounded-md border border-stone-200 bg-stone-50 p-4'>
            <h3 className='text-sm font-semibold text-stone-900'>
              {t('privacy.dataExport.title')}
            </h3>
            <p className='mt-2 text-sm text-stone-600'>
              {t('privacy.dataExport.description')}
            </p>
            <a
              href='/api/user/data-export'
              className='btn-secondary mt-4 inline-flex'
              target='_blank'
              rel='noreferrer'
            >
              {t('privacy.dataExport.cta')}
            </a>
          </div>

          <div className='rounded-md border border-red-200 bg-red-50 p-4'>
            <h3 className='text-sm font-semibold text-red-800'>
              {t('privacy.deleteAccount.title')}
            </h3>
            <p className='mt-2 text-sm text-red-700'>
              {t('privacy.deleteAccount.description')}
            </p>
            <div className='mt-4'>
              <DeleteAccountButton
                confirmMessage={t('privacy.deleteAccount.confirmMessage')}
                label={t('privacy.deleteAccount.cta')}
                pendingLabel={t('privacy.deleteAccount.pending')}
                errorMessage={t('privacy.deleteAccount.error')}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className='text-sm font-semibold text-stone-900'>
            {t('privacy.loginHistory.title')}
          </h3>
          <p className='mt-2 text-sm text-stone-600'>
            {t('privacy.loginHistory.description')}
          </p>
          {recentAuthEvents.length === 0 ? (
            <p className='mt-3 text-sm text-stone-600'>
              {t('privacy.loginHistory.empty')}
            </p>
          ) : (
            <div className='mt-3 space-y-2'>
              {recentAuthEvents.map((event) => (
                <div
                  key={event.id}
                  className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'
                >
                  <p className='text-sm font-medium text-stone-900'>
                    {event.event === 'register'
                      ? t('privacy.loginHistory.events.register')
                      : event.event === 'logout'
                        ? t('privacy.loginHistory.events.logout')
                        : event.event === 'password_reset'
                          ? t('privacy.loginHistory.events.passwordReset')
                          : event.event === 'email_verified'
                            ? t('privacy.loginHistory.events.emailVerified')
                            : t('privacy.loginHistory.events.login')}
                  </p>
                  <p className='mt-1 text-xs text-stone-600'>
                    {formatDateTime(event.createdAt, dateLocale, tCommon('unknown'))}
                    {' · '}
                    {(event.provider || 'email').toUpperCase()}
                    {event.ip ? ` · ${event.ip}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
