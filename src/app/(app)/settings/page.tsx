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

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return 'Bilinmiyor';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Bilinmiyor';
  }

  return parsed.toLocaleString('tr-TR');
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
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
          Profil ayarları
        </h1>
        <p className='mt-2 text-stone-700'>
          Hesap bilgilerini güncelleyebilir, hesap durumunu kontrol edebilirsin.
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
        <h2 className='text-lg font-semibold text-stone-900'>Hesap özeti</h2>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>Kullanıcı ID</p>
            <p className='mt-1 break-all text-sm font-medium text-stone-900'>{user.id}</p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>Kimlik sağlayıcı</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>{authProvider}</p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>E-posta doğrulama</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {isEmailConfirmed ? 'Doğrulandı' : 'Doğrulanmadı'}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>Hesap oluşturma</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(user.created_at)}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>Son giriş</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(user.last_sign_in_at)}
            </p>
          </div>
          <div className='rounded-md border border-stone-200 bg-stone-50 px-3 py-2'>
            <p className='text-xs text-stone-500'>Profil güncelleme</p>
            <p className='mt-1 text-sm font-medium text-stone-900'>
              {formatDateTime(profile?.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className='app-card'>
        <h2 className='text-lg font-semibold text-stone-900'>Profil bilgileri</h2>
        <p className='mt-2 text-sm text-stone-600'>
          Buradaki ad soyad bilgisi panelde karşılama metninde ve yeni özgeçmiş
          taslaklarında kullanılır.
        </p>

        <form action={updateProfileAction} className='space-y-4'>
          <label className='block'>
            <span className='form-label'>E-posta</span>
            <input
              type='email'
              value={profile?.email ?? user.email ?? ''}
              disabled
              className='form-input bg-stone-50 text-stone-500'
            />
          </label>

          <label className='block'>
            <span className='form-label'>
              Ad soyad
            </span>
            <input
              type='text'
              name='fullName'
              maxLength={120}
              defaultValue={profile?.fullName ?? ''}
              className='form-input'
              placeholder='Ad soyad girin'
            />
          </label>

          <button type='submit' className='btn-primary'>
            Profili güncelle
          </button>
        </form>
      </div>
    </section>
  );
}
