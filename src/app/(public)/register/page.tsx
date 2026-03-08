import Link from 'next/link';
import { registerAction } from './actions';

type RegisterPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <section>
      <h1 className='text-2xl font-bold text-slate-900'>Kayit ol</h1>
      <p className='mt-1 text-sm text-slate-600'>
        Supabase Auth ile guvenli sekilde yeni hesap olustur.
      </p>

      {searchParams?.error ? (
        <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={registerAction} className='mt-6 space-y-4'>
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
            placeholder='En az 6 karakter'
          />
        </label>

        <button
          type='submit'
          className='w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700'
        >
          Kayit ol
        </button>
      </form>

      <p className='mt-5 text-sm text-slate-600'>
        Zaten hesabin var mi?{' '}
        <Link href='/login' className='font-semibold text-slate-900 underline'>
          Giris yap
        </Link>
      </p>
    </section>
  );
}
