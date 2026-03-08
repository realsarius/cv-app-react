import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type HeroSectionProps = {
  isLoggedIn: boolean;
};

export default function HeroSection({ isLoggedIn }: HeroSectionProps) {
  const t = useTranslations('landing.hero');

  return (
    <section className='app-container pt-10 sm:pt-14'>
      <div className='grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
        <div className='space-y-5'>
          <p className='inline-flex rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700'>
            {t('badge')}
          </p>

          <h1 className='max-w-xl text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl'>
            {t('headline')}
          </h1>

          <p className='max-w-xl text-base text-stone-700 sm:text-lg'>
            {t('subheadline')}
          </p>

          <div className='flex flex-wrap items-center gap-3'>
            {isLoggedIn ? (
              <Link href='/dashboard' className='btn-primary'>
                {t('dashboardCta')}
              </Link>
            ) : (
              <Link href='/register' className='btn-primary'>
                {t('cta')}
              </Link>
            )}

            <a href='#templates' className='btn-secondary'>
              {t('ctaSecondary')}
            </a>
          </div>

          <p className='text-sm font-medium text-stone-600'>{t('socialProof')}</p>
        </div>

        <div className='app-card p-5 sm:p-6'>
          <div className='flex items-center justify-between border-b border-stone-200 pb-3'>
            <p className='text-sm font-semibold text-stone-800'>{t('previewTitle')}</p>
            <span className='rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700'>
              PDF
            </span>
          </div>

          <div className='space-y-4 pt-4'>
            <div className='space-y-2'>
              <div className='h-3 w-40 rounded bg-stone-300' />
              <div className='h-2 w-56 rounded bg-stone-200' />
            </div>

            <div className='space-y-2 border-t border-stone-200 pt-4'>
              <div className='h-2.5 w-28 rounded bg-stone-300' />
              <div className='h-2 w-full rounded bg-stone-200' />
              <div className='h-2 w-11/12 rounded bg-stone-200' />
            </div>

            <div className='space-y-2 border-t border-stone-200 pt-4'>
              <div className='h-2.5 w-24 rounded bg-stone-300' />
              <div className='h-2 w-full rounded bg-stone-200' />
              <div className='h-2 w-10/12 rounded bg-stone-200' />
            </div>

            <div className='space-y-2 border-t border-stone-200 pt-4'>
              <div className='h-2.5 w-32 rounded bg-stone-300' />
              <div className='h-2 w-full rounded bg-stone-200' />
              <div className='h-2 w-9/12 rounded bg-stone-200' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
