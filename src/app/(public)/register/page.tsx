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
      <h1 className='text-2xl font-bold tracking-tight text-stone-900'>Kayıt ol</h1>
      <p className='mt-2 text-sm text-stone-700'>
        Supabase Auth ile güvenli şekilde yeni hesap oluştur.
      </p>

      {searchParams?.error ? (
        <p className='message-error mt-4'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={registerAction} className='mt-6 space-y-4'>
        <label className='block'>
          <span className='form-label'>E-posta</span>
          <input
            type='email'
            name='email'
            required
            className='form-input'
            placeholder='ornek@mail.com'
          />
        </label>

        <label className='block'>
          <span className='form-label'>Şifre</span>
          <input
            type='password'
            name='password'
            required
            minLength={6}
            className='form-input'
            placeholder='En az 6 karakter'
          />
        </label>

        <button type='submit' className='btn-primary w-full'>
          Kayıt ol
        </button>
      </form>

      <p className='mt-5 text-sm text-stone-700'>
        Zaten hesabın var mı?{' '}
        <Link href='/login' className='font-semibold text-stone-900 underline'>
          Giriş yap
        </Link>
      </p>
    </section>
  );
}
