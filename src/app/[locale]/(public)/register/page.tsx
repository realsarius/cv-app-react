import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { registerAction } from './actions';

type RegisterPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const t = useTranslations('auth.register');

  return (
    <section>
      <h1 className='text-2xl font-bold tracking-tight text-stone-900'>{t('title')}</h1>
      <p className='mt-2 text-sm text-stone-700'>
        {t('description')}
      </p>

      {searchParams?.error ? (
        <p className='message-error mt-4'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={registerAction} className='mt-6 space-y-4'>
        <label className='block'>
          <span className='form-label'>{t('email')}</span>
          <input
            type='email'
            name='email'
            required
            className='form-input'
            placeholder='ornek@mail.com'
          />
        </label>

        <label className='block'>
          <span className='form-label'>{t('password')}</span>
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
          {t('submit')}
        </button>
      </form>

      <p className='mt-5 text-sm text-stone-700'>
        {t('hasAccount')}{' '}
        <Link href='/login' className='font-semibold text-stone-900 underline'>
          {t('login')}
        </Link>
      </p>
    </section>
  );
}
