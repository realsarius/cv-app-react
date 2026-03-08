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
      <h1 className='text-2xl font-bold tracking-tight text-stone-900'>Giriş yap</h1>
      <p className='mt-2 text-sm text-stone-700'>
        Hesabınıza giriş yaparak CV taslaklarınıza kaldığınız yerden devam edin.
      </p>

      {searchParams?.error ? (
        <p className='message-error mt-4'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={loginAction} className='mt-6 space-y-4'>
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
            placeholder='******'
          />
        </label>

        <button type='submit' className='btn-primary w-full'>
          Giriş yap
        </button>
      </form>

      <p className='mt-5 text-sm text-stone-700'>
        Hesabın yok mu?{' '}
        <Link href='/register' className='font-semibold text-stone-900 underline'>
          Kayıt ol
        </Link>
      </p>
    </section>
  );
}
