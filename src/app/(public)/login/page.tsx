import Link from 'next/link';
import { loginAction } from './actions';

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <section>
      <h1 className='text-2xl font-bold text-slate-900'>Giris yap</h1>
      <p className='mt-1 text-sm text-slate-600'>
        Hesabina giris yaparak CV taslaklarina kaldigin yerden devam et.
      </p>

      {searchParams?.error ? (
        <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={loginAction} className='mt-6 space-y-4'>
        <label className='block'>
          <span className='mb-1 block text-sm font-medium text-slate-700'>
            E-posta
          </span>
          <input
            type='email'
            name='email'
            required
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='ornek@mail.com'
          />
        </label>

        <label className='block'>
          <span className='mb-1 block text-sm font-medium text-slate-700'>
            Sifre
          </span>
          <input
            type='password'
            name='password'
            required
            minLength={6}
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500'
            placeholder='******'
          />
        </label>

        <button
          type='submit'
          className='w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700'
        >
          Giris yap
        </button>
      </form>

      <p className='mt-5 text-sm text-slate-600'>
        Hesabin yok mu?{' '}
        <Link href='/register' className='font-semibold text-slate-900 underline'>
          Kayit ol
        </Link>
      </p>
    </section>
  );
}
