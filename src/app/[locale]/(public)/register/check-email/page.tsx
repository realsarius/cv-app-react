import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { verifyEmailCodeAction } from './actions';

type CheckEmailPageProps = {
  searchParams?: {
    email?: string;
    error?: string;
  };
};

export default function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const email = searchParams?.email ?? '';
  const t = useTranslations('auth.checkEmail');

  return (
    <section>
      <h1 className='text-2xl font-bold tracking-tight text-stone-900'>
        {t('title')}
      </h1>
      <p className='mt-2 text-sm text-stone-700'>
        {t('description')}
      </p>
      <p className='mt-2 text-sm text-stone-700'>
        {t('descriptionFallback')}
      </p>

      {searchParams?.error ? (
        <p className='message-error mt-4'>
          {searchParams.error}
        </p>
      ) : null}

      <form action={verifyEmailCodeAction} className='mt-6 space-y-4'>
        <label className='block'>
          <span className='form-label'>{t('email')}</span>
          <input
            type='email'
            name='email'
            required
            defaultValue={email}
            className='form-input'
            placeholder='ornek@mail.com'
          />
        </label>

        <label className='block'>
          <span className='form-label'>{t('code')}</span>
          <input
            type='text'
            name='code'
            required
            inputMode='numeric'
            maxLength={12}
            pattern='[0-9]{6,12}'
            className='form-input'
            placeholder='94843772'
          />
          <span className='mt-1 block text-xs text-stone-600'>
            {t('codeHint')}
          </span>
        </label>

        <button type='submit' className='btn-primary w-full'>
          {t('submit')}
        </button>
      </form>

      <p className='mt-5 text-sm text-stone-700'>
        {t('backToLoginPrefix')}{' '}
        <Link href='/login' className='font-semibold text-stone-900 underline'>
          {t('backToLoginLink')}
        </Link>{' '}
        {t('backToLoginSuffix')}
      </p>
    </section>
  );
}
