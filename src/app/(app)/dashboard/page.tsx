import Link from 'next/link';
import { redirect } from 'next/navigation';
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

  let dbError: string | null = null;
  let profileName: string | null = null;
  let userResumes: Awaited<ReturnType<typeof listUserResumes>> = [];

  if (isDatabaseConfigured()) {
    try {
      const profile = await ensureUserProfile(user.id, user.email);
      profileName = profile?.fullName ?? null;
      userResumes = await listUserResumes(user.id);
    } catch {
      dbError =
        'Veritabani baglantisi kurulamadi. DATABASE_URL degerini kontrol edin.';
    }
  }

  return (
    <section className='space-y-5'>
      <header>
        <h1 className='text-3xl font-bold text-slate-900'>Dashboard</h1>
        <p className='mt-1 text-slate-700'>
          Hos geldin{' '}
          <span className='font-semibold'>{profileName || user.email}</span>
        </p>
      </header>

      {searchParams?.error ? (
        <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {searchParams.error}
        </p>
      ) : null}

      {!isDatabaseConfigured() ? (
        <p className='rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
          `DATABASE_URL` eksik oldugu icin resume listesi yuklenemiyor.
        </p>
      ) : null}

      {dbError ? (
        <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {dbError}
        </p>
      ) : null}

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Yeni taslak olustur</h2>
        <form action={createDraftResumeAction} className='mt-4 flex flex-col gap-3 sm:flex-row'>
          <input
            type='text'
            name='title'
            maxLength={120}
            placeholder='Ornek: Frontend Developer CV'
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
          />
          <button
            type='submit'
            className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400'
            disabled={!isDatabaseConfigured()}
          >
            Taslak olustur
          </button>
        </form>
      </div>

      <div className='rounded-xl border border-slate-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-slate-900'>Resume listesi</h2>

        {isDatabaseConfigured() && userResumes.length === 0 ? (
          <p className='mt-3 text-sm text-slate-600'>
            Henuz resume yok. Ilk taslagini olusturarak baslayabilirsin.
          </p>
        ) : null}

        <ul className='mt-3 space-y-3'>
          {userResumes.map((resume) => (
            <li
              key={resume.id}
              className='rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='font-semibold text-slate-900'>{resume.title}</span>
                <span className='rounded bg-slate-100 px-2 py-0.5 text-xs uppercase'>
                  {resume.status}
                </span>
              </div>
              <p className='mt-1 text-xs text-slate-500'>
                Son guncelleme: {new Date(resume.updatedAt).toLocaleString('tr-TR')}
              </p>
              <Link
                href={`/resumes/${resume.id}`}
                className='mt-2 inline-flex rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500'
              >
                Editoru ac
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
