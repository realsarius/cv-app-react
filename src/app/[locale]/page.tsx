import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('landing');

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center p-6'>
      <section className='w-full rounded-lg border border-stone-300 bg-white p-8 shadow-sm'>
        <h1 className='text-3xl font-bold tracking-tight text-stone-900'>
          {t('title')}
        </h1>
        <p className='mt-3 max-w-2xl text-stone-700'>
          {t('description')}
        </p>

        <div className='mt-6 flex flex-wrap gap-3'>
          <Link href='/login' className='btn-primary'>
            {t('login')}
          </Link>
          <Link href='/register' className='btn-secondary'>
            {t('register')}
          </Link>
        </div>
      </section>
    </main>
  );
}
