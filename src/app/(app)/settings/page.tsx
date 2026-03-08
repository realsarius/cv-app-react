import { redirect } from 'next/navigation';
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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=Supabase+ortam+degiskenleri+eksik');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (!isDatabaseConfigured()) {
    redirect('/dashboard?error=DATABASE_URL+veya+DATABASE_DEV_URL+eksik');
  }

  await ensureUserProfile(user.id, user.email);
  const profile = await getOwnProfile(user.id);

  return (
    <section className='space-y-5'>
      <header>
        <h1 className='text-3xl font-bold text-slate-900'>Profil ayarlari</h1>
        <p className='mt-1 text-slate-700'>
          Hesap bilgilerini guncelleyebilirsin.
        </p>
      </header>

      {searchParams?.error ? (
        <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {searchParams.error}
        </p>
      ) : null}

      {searchParams?.success ? (
        <p className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'>
          {searchParams.success}
        </p>
      ) : null}

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <form action={updateProfileAction} className='space-y-4'>
          <label className='block'>
            <span className='mb-1 block text-sm font-medium text-slate-700'>
              E-posta
            </span>
            <input
              type='email'
              value={profile?.email ?? user.email ?? ''}
              disabled
              className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500'
            />
          </label>

          <label className='block'>
            <span className='mb-1 block text-sm font-medium text-slate-700'>
              Ad soyad
            </span>
            <input
              type='text'
              name='fullName'
              maxLength={120}
              defaultValue={profile?.fullName ?? ''}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
              placeholder='Ad soyad girin'
            />
          </label>

          <button
            type='submit'
            className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700'
          >
            Profili guncelle
          </button>
        </form>
      </div>
    </section>
  );
}
